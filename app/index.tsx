import React, { useEffect, useState } from "react";
import { Modal, Form, Input, FormProps, ConfigProvider, Select, Segmented, Flex, DatePicker, theme, Layout, List, FloatButton, Col, Row } from 'antd'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlus, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons'
import ru_RU from 'antd/locale/ru_RU'
import dayjs, { Dayjs } from "dayjs";
import { Content, Header } from "antd/lib/layout/layout";
import { MoonOutlined, PlusOutlined, SunOutlined } from "@ant-design/icons";
import TargetPlot from "@/components/ui/target-plot";

library.add(faPlus, faEllipsisVertical)

type Metric = {
  date: Date;
  users: number;
  country: string;
}

type AnomalyInterval = {
  start: Date;
  end: Date;
}

export type Anomaly = {
  interval: AnomalyInterval;
}

type Response = {
  metrics: Metric[];
  anomalies: Anomaly[]; 
}

class DataRow {
  date: Date;
  users: number;
  country: string

  constructor(date: Date, value: number, target: string) {
    this.date = date;
    this.users = value;
    this.country = target;
  }
}

class Target {
  name: string;
  countries: string[]
  data?: DataRow[];
  anomalies?: Anomaly[];

  constructor(name: string, data: DataRow[], countries: string[]) {
    this.name = name;
    this.data = data;
    this.countries = countries;
  }
}

type FieldType = {
  targets: {value: string, label: string}[];
  name: string;
};

enum Type {
  RELAY,
  BRIDGE,
  ALL
}

type Interval = {
  start?: Dayjs | null;
  end?: Dayjs | null;
}

enum Theme {
  LIGHT,
  DARK
}


export default function Index() {
  const [ targets, setTargets] = useState<Target[]>([])
  const [ isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [ manuallyChanged, setManuallyChanged ] = useState<boolean>(false);
  const [ form ] = Form.useForm();
  const [ type, setType ] =  useState<Type>(Type.RELAY);
  const [ interval, setInterval] = useState<Interval>({start: dayjs().add(-1, "year"), end: dayjs()})
  const [ userTheme, setUserTheme ] = useState<Theme>(Theme.LIGHT)

  useEffect(() => {
    setTargets(targets.map(target => ({...target, data: undefined})));
    Promise.all(targets.map(target => (getData(target.countries).then(data => ({...target, data: data.metrics, anomalies: data.anomalies})))))
      .then(newTargets => setTargets(newTargets));
  }, [type, interval]);

  function onAddButtonClick() {
    setIsModalOpen(true);
  }

  function onModalOk() {
    form.submit();
  }

  function onModalCancel() {
    setIsModalOpen(false);
    setManuallyChanged(false);
  }

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    onModalCancel();
    console.log("ON FINISH")
    let countries = values.targets.map(target => target.value);
    let target: Target = {name: values.name, countries}
    setTargets([...targets, target]);
    let data = await getData(countries);
    setTargets([...targets.filter(t => t != target), {name: values.name, data: data.metrics, anomalies: data.anomalies, countries}]);
  };

  function fillName() {
    let targets: { value: string; label: string }[] = form.getFieldValue('targets');
    
    if (manuallyChanged) return;

    let label = (targets ?? []).map(target => target.label).join(', ')
    form.setFieldValue('name', label);
  }

  async function fetchData(link: string): Promise<Response>{
    return fetch(link)
      .then(response => response.json());
  }

  async function fetchRelay(target: string[]) {
    let relayLink = `http://localhost:8080/v1/metrics/relays?from=${interval.start?.toISOString()}&to=${interval.end?.toISOString()}&countries=${target}`;
    return fetchData(relayLink);
  }

  async function fetchBridge(target: string[]) {
    let bridgeLink = `http://localhost:8080/v1/metrics/bridges?from=${interval.start?.toISOString()}&to=${interval.end?.toISOString()}&countries=${target}`
    return fetchData(bridgeLink);
  }

  async function fetchAll(target: string[]) {
    let allLink = `http://localhost:8080/v1/metrics/all?from=${interval.start?.toISOString()}&to=${interval.end?.toISOString()}&countries=${target}`
    return fetchData(allLink);
  }

  async function fetchTarget(targets: string[]): Promise<Response> {
    if (type == Type.RELAY) return fetchRelay(targets);
    if (type == Type.BRIDGE) return fetchBridge(targets);
    if (type == Type.ALL) return fetchAll(targets);
    return Promise.reject();
  }

  async function getData(targets: string[]): Promise<Response> {
    return fetchTarget(targets);
  }

  function deleteTarget(idx: number) {
    setTargets(targets.filter((target, i) => i != idx));
  }

  return (
    <ConfigProvider locale={ru_RU} theme={{
      algorithm: userTheme == Theme.DARK ? theme.darkAlgorithm : theme.defaultAlgorithm
    }}>
      <Layout>
        <Header style={{height: '60pt'}}>
          <Flex justify="space-between" align="middle">
            <Flex justify="center" align="middle" flex={1}>
              <Flex vertical gap={5} align="middle" style={{padding: 5}}>
                <Flex justify="center" align="middle">                    
                  <Segmented
                    value={type} onChange={type => setType(type)}
                    options={[
                        { value: Type.RELAY, label: 'Relay' },
                        { value: Type.BRIDGE, label: 'Bridge' },
                        { value: Type.ALL, label: 'Все' },
                    ]}
                  />
                </Flex>
                <DatePicker.RangePicker value={[interval.start, interval.end]} onChange={values => setInterval({start: values?.[0], end: values?.[1]})}></DatePicker.RangePicker>
              </Flex>
            </Flex>
            <Flex vertical justify="center">
              <Segmented size="large"
                value={userTheme} onChange={theme => setUserTheme(theme)} 
                options={[
                      { value: Theme.LIGHT, icon: <SunOutlined />, },
                      { value: Theme.DARK, icon: <MoonOutlined /> },
              ]}/>
            </Flex>
          </Flex>
        </Header>
        <Content style={{overflowY: 'scroll', overflowX: 'hidden', padding: 10}}>
          <Row gutter={[16, 16]}>
            {
              targets.map((target, i) => (
                <Col key={i} md={24} lg={12} xxl={8} style={{width: '100%'}}>
                  <TargetPlot stats={target.data} anomalies={target.anomalies} targetName={target.name} onDelete={() => deleteTarget(i)}></TargetPlot>
                </Col>
              ))
            }
          </Row>
          <FloatButton
            onClick={onAddButtonClick}
            icon={<PlusOutlined />}
            type="primary"
            style={{
              insetInlineEnd: 54,
            }}
          />
        <Modal title="Новый объект интереса" 
          open={isModalOpen} destroyOnClose onCancel={onModalCancel} 
          okButtonProps={{ autoFocus: true, htmlType: 'submit' }}
          modalRender={(dom) => (
            <Form
              layout="vertical"
              form={form}
              name="newTargetForm"
              clearOnDestroy
              onFinish={onFinish}
            >
              {dom}
            </Form>
          )}
        >
          <Form.Item<FieldType>
            label="Страны"
            name="targets"
          >
            <Select mode="multiple" labelInValue onChange={() => fillName()} options={[
              {label: 'Россия', value: 'ru'},
              {label: 'США', value: 'us'},
              {label: 'Эстония', value: 'ee'},
              {label: 'Латвия', value: 'lv'},
              {label: 'Германия', value: 'de'},
              {label: 'Нидерланды', value: 'nl'},
            ]}/>
          </Form.Item>

          <Form.Item<FieldType>
            label="Название"
            name="name"
            rules={[{ required: true, message: 'Введите название!' }, {min: 3, message: 'Минимум 3 символа!'}]}
            >
              <Input onChange={() => setManuallyChanged(true)}/>
          </Form.Item>
        </Modal>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
                                                              