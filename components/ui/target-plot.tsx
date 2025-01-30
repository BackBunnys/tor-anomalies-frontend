import { Area, Heatmap } from "@ant-design/plots";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Card, ConfigProvider, Dropdown, Flex, Modal, Segmented, theme } from "antd";
import { AreaChartOutlined, DeleteOutlined, HeatMapOutlined } from "@ant-design/icons"
import React, { useContext, useState } from "react";
import moment from "moment";

enum Type {
    LINE,
    HEAT
}

export default function TargetPlot({stats, targetName, onDelete} : any) {
    const t = useContext(ConfigProvider.ConfigContext).theme;
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
    const [type, setType] = useState<Type>(Type.LINE);

    const config = {
        data: stats ?? [],
        padding: 'auto',
        xField: 'date',
        yField: 'value',
        loading: stats == undefined,
        slider: {
            x: {
                values: [0.8, 1],
            },
        },
        colorField: 'target',
        animate: { enter: { type: 'growInX' } },
        stack: true,
        height: 350,
        theme: t?.algorithm == theme.darkAlgorithm ? 'classicDark' : 'classic'
    };

    const getISOWeekStart = (dateString: string) => {
        return moment(dateString).startOf("week").format("YYYY-MM-DD")
    };

    function groupData(data: any[]) {
        let dateCount = new Map<string, number>();

        data?.forEach(row => {
            dateCount.set(row.date, (dateCount.get(row.date) ?? 0) + row.value)
        })

        return [...dateCount.entries().map(entry => ({'date': entry[0], 'value': entry[1]}))];
    }

    const heatConfig = {
        data: groupData(stats),
        xField: (value: any) => getISOWeekStart(value.date),
        yField: (value: any) => new Date(value.date).toLocaleString("ru", { weekday: "short" }),
        colorField: 'value',
        legend: {},
        mark: 'cell',
        tooltip: {
          title: 'value',
          field: 'value',
          name: 'Кол-во пользователей'
        },
        animate: null,
        slider: {
            x: {
                values: [0.8, 1],
            },
        },
        sizeField: "target",
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
            } onDoubleClick={() => setIsModalOpen(true)} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Area {...config} />

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
                {type == Type.LINE && <Area {...config} />}
                {type == Type.HEAT && <Heatmap {...heatConfig} />}
            </Modal>
        </Card>
    );
}