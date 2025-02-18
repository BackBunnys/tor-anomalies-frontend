import { Area, Heatmap } from "@ant-design/plots";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Card, ConfigProvider, Dropdown, Flex, Modal, Segmented, theme } from "antd";
import { AreaChartOutlined, DeleteOutlined, HeatMapOutlined } from "@ant-design/icons"
import React, { useCallback, useContext, useState } from "react";
import moment from "moment";
import { Anomaly } from "@/app";

enum Type {
    LINE,
    HEAT
}

export default function TargetPlot({stats, anomalies, targetName, onDelete} : any) {
    const t = useContext(ConfigProvider.ConfigContext).theme;
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
    const [type, setType] = useState<Type>(Type.LINE);

    const config = {
        data: stats ?? [],
        padding: 'auto',
        xField: 'date',
        yField: 'users',
        loading: stats == undefined,
        slider: {
            x: {
                values: [0.8, 1],
            },
        },
        colorField: 'country',
        animate: { enter: { type: 'growInX' } },
        stack: true,
        height: 350,
        annotations: [
            {
              type: "rangeX",
              data: anomalies?.filter((anomaly: Anomaly) => anomaly.interval.start != anomaly.interval.end)
              .map((anomaly: Anomaly) => ({
                date: [anomaly.interval.start, anomaly.interval.end],
                event: "hz"
              })),
              xField: 'date',
              yField: 'event',
              scale: { color: { independent: true, color: ["#FAAD14"] } },
              style: { fillOpacity: 0.35, fill: '#FAAD14' },
            },
            {
                type: "lineX",
                data: anomalies?.filter((anomaly: Anomaly) => anomaly.interval.start == anomaly.interval.end)
                    .map((anomaly: Anomaly) => ({date: anomaly.interval.start})),
                xField: 'date',
                style: { stroke: "#FAAD14", strokeOpacity: 0.25, lineWidth: 2 }
            }
          ],
        sort: {fields: ['date']},
        theme: t?.algorithm == theme.darkAlgorithm ? 'classicDark' : 'classic'
    };

    const getISOWeekStart = (date: Date) => {
        return moment(date).startOf("week").format("YYYY-MM-DD")
    };

    const groupData = useCallback(
      () => {
        let dateCount = new Map<string, number>();

        stats?.forEach((row: { date: string; users: number; }) => {
            dateCount.set(row.date, (dateCount.get(row.date) ?? 0) + row.users)
        })

        return [...dateCount.entries().map(entry => ({'date': new Date(entry[0]), 'users': entry[1]}))];
      },
      [stats],
    )

    const weekdayOrder = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];


    const heatConfig = {
        data: groupData(),
        xField: (value: any) => getISOWeekStart(value.date),
        yField: (value: any) => value.date.getDay(),
        sort: {fields: 'date'},
        colorField: 'users',
        legend: {},
        mark: 'cell',
        axis: {'y' : {labelFormatter: (value: any) => weekdayOrder[value]}},
        tooltip: {
          title: 'users',
          field: 'users',
          name: 'Кол-во пользователей'
        },
        animate: null,
        slider: {
            x: {
                values: [0.8, 1],
            },
        },
        scale: {
            color: { range: ["yellow", "red"] },
        },
        sizeField: "country",
        theme: t?.algorithm == theme.darkAlgorithm ? 'classicDark' : 'classic'
      };

    const menuItems = [
        {
            label: 'Удалить',
            key: '1',
            icon: <DeleteOutlined twoToneColor="red" />,
            danger: true,
            onClick: onDelete
        }  
    ]

    return (
        <Card title={targetName} bordered={false} hoverable extra={
            <Dropdown menu={{ items: menuItems }} placement="bottomLeft">
                <Button type="text"><FontAwesomeIcon icon={"ellipsis-vertical"}/></Button>
            </Dropdown>
            } onDoubleClick={() => setIsModalOpen(true)} style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
            <Area {...config}/>

            <Modal title={targetName} open={isModalOpen} width="100%" onClose={() => setIsModalOpen(false)} onCancel={() => setIsModalOpen(false)} destroyOnClose>
                <Flex justify="end">
                    <Segmented size="large"
                        value={type} onChange={type => setType(type)}
                        options={[
                            { value: Type.LINE, icon: <AreaChartOutlined /> },
                            { value: Type.HEAT, icon: <HeatMapOutlined />},
                        ]}
                    />
                </Flex>
                {type == Type.LINE && <Area {...config}/>}
                {type == Type.HEAT && <Heatmap {...heatConfig} />}
            </Modal>
        </Card>
    );
}