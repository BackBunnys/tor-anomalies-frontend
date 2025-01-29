import React, { useEffect, useState } from "react";
import { readRemoteFile } from 'react-papaparse';
import { Row, Col, Button, Modal, Form, Input, FormProps, ConfigProvider, Select, Segmented, Flex, DatePicker, theme, Layout } from 'antd'
import TargetPlot from "@/components/ui/target-plot";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlus, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons'
import ru_RU from 'antd/locale/ru_RU'
import dayjs, { Dayjs } from "dayjs";
import { Content, Header } from "antd/lib/layout/layout";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";

library.add(faPlus, faEllipsisVertical)

class DataRow {
  date: string;
  value: number;
  target: string

  constructor(date: string, value: number, target: string) {
    this.date = date;
    this.value = value;
    this.target = target;
  }
}

class Target {
  name: string;
  countries: string[]
  data: DataRow[];

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

export default function HomeScreen() {
  const [ targets, setTargets] = useState<Target[]>([])
  const [ isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [ manuallyChanged, setManuallyChanged ] = useState<boolean>(false);
  const [ form ] = Form.useForm();
  const [ type, setType ] =  useState<Type>(Type.RELAY);
  const [ interval, setInterval] = useState<Interval>({start: dayjs().add(-1, "year"), end: dayjs()})
  const [ userTheme, setUserTheme ] = useState<Theme>(Theme.LIGHT)

  useEffect(() => {
    Promise.all(targets.map(target => (getData(target.countries).then(data => ({...target, data})))))
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
    let countries = values.targets.map(target => target.value);
    let data = await getData(countries);
    setTargets([...targets, {name: values.name, data, countries}]);
  };

  function fillName() {
    let targets: { value: string; label: string }[] = form.getFieldValue('targets');
    
    if (manuallyChanged) return;

    let label = (targets ?? []).map(target => target.label).join(', ')
    form.setFieldValue('name', label);
  }

  async function fetchData(link: string, target: string): Promise<DataRow[]>{
    return new Promise<DataRow[]>(
      resolve => {
        readRemoteFile(link, {
          complete: (results) => {
            let data = results.data;
            resolve(data.slice(6).map((row: any) => new DataRow(row[0] as string, Number.parseInt(row[2]), target)))
          },
          download: true,
          skipEmptyLines: true
        });
      }
    );
  }

  async function fetchRelay(target: string) {
    let relayLink = `https://metrics.torproject.org/userstats-relay-country.csv?start=${interval.start?.toISOString()}&end=${interval.end?.toISOString()}&country=${target}`;
    return fetchData(relayLink, target);
  }

  async function fetchBridge(target: string) {
    let bridgeLink = `https://metrics.torproject.org/userstats-bridge-country.csv?start=${interval.start?.toISOString()}&end=${interval.end?.toISOString()}&country=${target}`
    return fetchData(bridgeLink, target);
  }

  function groupData(data: DataRow[][], target: string): DataRow[] {
    let dateCount = new Map<string, number>();

    data.forEach(row => {
      row.forEach(column => {
        dateCount.set(column.date, (dateCount.get(column.date) ?? 0) + column.value)
      })
    });

    return [...dateCount.entries().map(entry => ({'date': entry[0], 'value': entry[1], target}))];
  }

  async function fetch(target: string): Promise<DataRow[]> {
    if (type == Type.RELAY) return fetchRelay(target);
    if (type == Type.BRIDGE) return fetchBridge(target);
    if (type == Type.ALL) return Promise.all([fetchRelay(target), fetchBridge(target)]).then(results => groupData(results, target ));
    return Promise.resolve([])
  }

  async function getData(targets: string[]): Promise<DataRow[]> {
    return Promise.all<DataRow[]>(
      targets.map(target => fetch(target))
    ).then(results => {
      return results.flatMap(data => data);
    });
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
        <Content style={{overflowY: 'scroll'}}>
        <Row gutter={[16, 16]} style={{margin: 5}}>
          {
            targets.map((target, i) => (
              <Col key={i} xxl={8} lg={12} md={24}>
                {<TargetPlot stats={target.data} targetName={target.name} onDelete={() => deleteTarget(i)}></TargetPlot>}
              </Col>
            ))
          }
          <Col xxl={8} lg={12} md={24} style={{width: '100%'}}>
            <Button color="primary" variant="dashed" style={{height: '100%', width: '100%'}} onClick={onAddButtonClick}>
              <FontAwesomeIcon style={{width: "100%", height: "100%", maxWidth: '400px', maxHeight: '400px'}} icon={"plus"}></FontAwesomeIcon> 
            </Button>
          </Col>
        </Row>
        <Modal title="Новый объект интереса" 
          open={isModalOpen} destroyOnClose
          onOk={onModalOk} onCancel={onModalCancel} 
          okButtonProps={{ autoFocus: true, htmlType: 'submit' }}
          modalRender={(dom) => (
            <Form
              layout="vertical"
              form={form}
              name="newTargetForm"
              initialValues={{ modifier: 'public' }}
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
