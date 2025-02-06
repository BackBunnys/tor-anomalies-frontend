import React, { useEffect, useState } from "react";
import { Modal, Form, Input, FormProps, ConfigProvider, Select, Segmented, Flex, DatePicker, theme, Layout, List, FloatButton, Col, Row, Slider, SliderSingleProps, Tooltip } from 'antd'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlus, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons'
import ru_RU from 'antd/locale/ru_RU'
import dayjs, { Dayjs } from "dayjs";
import { Content, Header } from "antd/lib/layout/layout";
import { InfoCircleOutlined, InfoCircleTwoTone, MoonOutlined, PlusOutlined, SunOutlined } from "@ant-design/icons";
import TargetPlot from "@/components/ui/target-plot";
import TelegramLoginButton from "@/components/ui/telegram-login-button";

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
  sensitivity: Sensitivity = Sensitivity.LOW; 
  countries: string[]
  data?: DataRow[] = [];
  anomalies?: Anomaly[] = [];

  constructor(name: string, data: DataRow[], countries: string[]) {
    this.name = name;
    this.data = data;
    this.countries = countries;
  }
}

enum Sensitivity {
  LOW='LOW',
  MEDIUM='MEDIUM',
  HIGH='HIGH'
}

type FieldType = {
  targets: {value: string, label: string}[];
  name: string;
  sensitivity: number;
};

const marks: SliderSingleProps['marks'] = {
  1: 'Низкая',
  2: 'Средняя',
  3: 'Высокая',
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
    Promise.all(targets.map(target => (getData(target.countries, target.sensitivity).then(data => ({...target, data: data.metrics, anomalies: data.anomalies})))))
      .then(newTargets => setTargets(newTargets));
  }, [type, interval]);

  function onAddButtonClick() {
    setIsModalOpen(true);
  }

  function onModalCancel() {
    setIsModalOpen(false);
    setManuallyChanged(false);
  }

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    onModalCancel();
    let countries = values.targets.map(target => target.value);
    let target: Target = {name: values.name, countries, sensitivity: getSensitivity(values.sensitivity)}
    setTargets([...targets, target]);
    let data = await getData(countries, getSensitivity(values.sensitivity));
    setTargets([...targets.filter(t => t != target), {name: values.name, data: data.metrics, anomalies: data.anomalies, countries, sensitivity: getSensitivity(values.sensitivity)}]);
  };

  function getSensitivity(value: number): Sensitivity {
    if (value === 1) return Sensitivity.LOW;
    if (value === 2) return Sensitivity.MEDIUM;
    if (value === 3) return Sensitivity.HIGH;

    return Sensitivity.LOW;
  }

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

  async function fetchRelay(target: string[], sensitivity: Sensitivity) {
    let relayLink = `http://localhost:8080/v1/metrics/relays?from=${interval.start?.toISOString()}&to=${interval.end?.toISOString()}&countries=${target}&sensitivity=${sensitivity}`;
    return fetchData(relayLink);
  }

  async function fetchBridge(target: string[], sensitivity: Sensitivity) {
    let bridgeLink = `http://localhost:8080/v1/metrics/bridges?from=${interval.start?.toISOString()}&to=${interval.end?.toISOString()}&countries=${target}&sensitivity=${sensitivity}`
    return fetchData(bridgeLink);
  }

  async function fetchAll(target: string[], sensitivity: Sensitivity) {
    let allLink = `http://localhost:8080/v1/metrics/all?from=${interval.start?.toISOString()}&to=${interval.end?.toISOString()}&countries=${target}&sensitivity=${sensitivity}`
    return fetchData(allLink);
  }

  async function fetchTarget(targets: string[], sensitivity: Sensitivity): Promise<Response> {
    if (type == Type.RELAY) return fetchRelay(targets, sensitivity);
    if (type == Type.BRIDGE) return fetchBridge(targets, sensitivity);
    if (type == Type.ALL) return fetchAll(targets, sensitivity);
    return Promise.reject();
  }

  async function getData(targets: string[], sensitivity: Sensitivity): Promise<Response> {
    return fetchTarget(targets, sensitivity);
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
          <Flex justify="space-between" align="middle" wrap='wrap-reverse'>
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
              <Flex justify="center">
                <Segmented
                  value={userTheme} onChange={theme => setUserTheme(theme)} 
                  options={[
                        { value: Theme.LIGHT, icon: <SunOutlined />, },
                        { value: Theme.DARK, icon: <MoonOutlined /> },
                ]}/>
              </Flex>
              {/* <TelegramLoginButton botName="tmadbsc_bot" onAuth={() => console.log("Login successful!")}></TelegramLoginButton> */}
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

          <Form.Item<FieldType>
            label={<span>Чувствительность <Tooltip title="В зависимости от данного значения будет настроено окно анализа"><InfoCircleTwoTone/></Tooltip></span>}
            name="sensitivity"
            >
              <Slider min={1} max={3} marks={marks} tooltipVisible={false}/>
          </Form.Item>
        </Modal>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
                                                              