import React, { useEffect, useRef, useState } from "react";
import { Node } from "./Node";
import { NodeBase, Edge, JunctionNode, Sum, Generator, Modifier, FSFilter, Display, Fusion, selectionModeEnum, DiscretePID } from './NodeTypes';
import { Plant } from "./NodeTypes/Plant";
import { simulate } from './SimEngine';

export const Simulation = () => {
    const canvasRef = useRef(null);
    const [nodes, setNodes] = useState<NodeBase[]>([]);

    const [edgeList, setEdgeList] = useState<Edge[]>([]);

    const [Ts, setTs] = useState<number>(0.01);
    const [simulationSteps, setSimulationSteps] = useState<number>(100);
    const [plantExists, setPlantExists] = useState<boolean>(false);
    const [simFinishTrigger, setSimFinishTrigger] = useState(false);
    const [showSimFinishMessage, setShowSimFinishMessage] = useState(false);

    useEffect(() => {
        const initNodes = [
            new Generator("step", 100, 130, 2),
            new Sum("sum", 250, 130),
            new DiscretePID("pid", 350, 130, 2),
            new Plant("plant", 500, 130, [2, 5], [1, 3, 2]),
            new Display("disp", 700, 130),
            new Modifier("mod", 380, 230, 0.1, 0),
        ];
        const initEdgeList = [
            { from: initNodes[0], to: initNodes[1], fromPos: 1, toPos: 3 },
            { from: initNodes[1], to: initNodes[2], fromPos: 1, toPos: 3 },
            { from: initNodes[2], to: initNodes[3], fromPos: 1, toPos: 3 },
            { from: initNodes[3], to: initNodes[4], fromPos: 1, toPos: 3 },

            { from: initNodes[3], to: initNodes[5], fromPos: 2, toPos: 1 },
            { from: initNodes[5], to: initNodes[1], fromPos: 3, toPos: 2 },
        ];

        (initNodes[1] as Sum).setSign(initNodes[5].id, "-");
        (initNodes[1] as Sum).setSign(initNodes[0].id, "+");

        initNodes[0].increaseOutDegree();
        initNodes[1].increaseInDegree();

        initNodes[1].increaseOutDegree();
        initNodes[2].increaseInDegree();

        initNodes[2].increaseOutDegree();
        initNodes[3].increaseInDegree();

        setPlantExists(true);
        setNodes(initNodes);
        setEdgeList(initEdgeList);
    }, []);

    useEffect((
    ) => {
        if (!simFinishTrigger) return;
        setSimFinishTrigger(false);
        setShowSimFinishMessage(true);
        setTimeout(() => setShowSimFinishMessage(false), 4000);
    }, [simFinishTrigger])

    const [selectedMode, setSelectedMode] = useState<selectionModeEnum>(selectionModeEnum.ADD_GENERATOR);

    const [connectionFrom, setConnectionFrom] = useState<NodeBase | undefined>(undefined);

    const coordfallsInShape = ({ x, y }, node) => {
        const left = node.x;
        const right = left + node.width;
        const top = node.y;
        const bottom = top + node.height;
        return x > left && x < right && y > top && y < bottom;
    }

    const updateNodePosition = (id, newPosition) => {
        setNodes(prevNodes =>
            prevNodes.map(node => {
                if (node.id === id) {
                    const copy = Object.create(Object.getPrototypeOf(node));
                    Object.assign(copy, node);
                    copy.x = newPosition.x;
                    copy.y = newPosition.y;
                    return copy;
                }
                return node;
            })
        );

    };

    const findNodeIfExists = (x: number, y: number) => {
        for (let i = 0; i < nodes.length; i++) {
            if (coordfallsInShape({ x: x, y: y }, nodes[i])) {
                return nodes[i];
            }
        }
        return null;
    }

    const genRndId = () => { return String(Math.round(Math.random() * 10000) / 10000) }

    const handleCanvasOnClick = (e) => {
        try {
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - canvasRect.left;
            const y = e.clientY;
            const node = findNodeIfExists(x, y);
            switch (selectedMode) {
                case selectionModeEnum.ADD_PLANT:
                    if (plantExists) throw new Error("Plant already exists.");
                    setPlantExists(true);
                    if (!node) {
                        setNodes((prev) => [...prev, new Plant("plant" + genRndId(), x - (Plant.defaultWidth / 2), y - (Plant.defaultHeight / 2), [], [])]);
                    }
                    break;
                case selectionModeEnum.ADD_GENERATOR:
                    if (!node) {
                        setNodes((prev) => [...prev, new Generator("gen" + genRndId(), x - (Generator.defaultWidth / 2), y - (Generator.defaultHeight / 2))]);
                    }
                    break;
                case selectionModeEnum.ADD_FSFILTER:
                    if (!node) {
                        setNodes((prev) => [...prev, new FSFilter("filter" + genRndId(), x - (FSFilter.defaultWidth / 2), y - (FSFilter.defaultHeight / 2))]);
                    }
                    break;
                case selectionModeEnum.ADD_DISPLAY:
                    if (!node) {
                        setNodes((prev) => [...prev, new Display("disp" + genRndId(), x - (Display.defaultWidth / 2), y - (Display.defaultHeight / 2))]);
                    }
                    break;
                case selectionModeEnum.ADD_FUSION:
                    if (!node) {
                        setNodes((prev) => [...prev, new Fusion("fusion" + genRndId(), x - (Fusion.defaultWidth / 2), y - (Fusion.defaultHeight / 2))]);
                    }
                    break;
                case selectionModeEnum.ADD_SUM:
                    if (!node) {
                        setNodes((prev) => [...prev, new Sum("sum" + genRndId(), x - (Sum.defaultWidth / 2), y - (Sum.defaultHeight / 2))]);
                    }
                    break;
                case selectionModeEnum.ADD_MODIFIER:
                    if (!node) {
                        setNodes((prev) => [...prev, new Modifier("mod" + genRndId(), x - (Modifier.defaultWidth / 2), y - (Modifier.defaultHeight / 2), 1, 0)]);
                    }
                    break;
                case selectionModeEnum.REMOVE:
                    if (node) {
                        setEdgeList(prevEdges =>
                            prevEdges.filter(
                                e => e.to.id !== node.id && e.from.id !== node.id
                            )
                        );
                        setNodes(prevNodes => prevNodes.filter(n => n.id != node.id));
                    }
                    if (node instanceof Plant) {
                        setPlantExists(false);
                    }

                    break;
                case selectionModeEnum.MAKE_CONNECTION:
                    if (node) {
                        if (!connectionFrom) {
                            setConnectionFrom(node);
                        } else if (connectionFrom != node) {
                            let fromPos, toPos;

                            if (Math.abs(node.x - connectionFrom.x) < node.height) {
                                fromPos = node.y > connectionFrom.y ? 2 : 0;
                                toPos = node.y > connectionFrom.y ? 0 : 2;
                            }
                            else if (node.x > connectionFrom.x) {
                                fromPos = 1;
                                toPos = 3;
                            } else {
                                fromPos = 3;
                                toPos = 1;
                            }
                            setEdgeList((prev) => [...prev, { from: connectionFrom, to: node, fromPos: fromPos, toPos: toPos }]);

                            setNodes(prev =>
                                prev.map(n => {
                                    if (n.id === node.id) {
                                        const copy = Object.create(Object.getPrototypeOf(n));
                                        Object.assign(copy, n);
                                        copy.increaseInDegree();
                                        return copy;
                                    }
                                    if (n.id === connectionFrom.id) {
                                        const copy = Object.create(Object.getPrototypeOf(n));
                                        Object.assign(copy, n);
                                        copy.increaseOutDegree();
                                        return copy;
                                    }
                                    return n;
                                })
                            );
                            setConnectionFrom(null);
                        }
                    }
                    break;
            }
        } catch (e) {
            alert(e.message);
        }
    }

    return (
        <>
            <div className="w-[calc(100vw-230px)] mr-5 flex justify-between fixed bg-white z-50 pl-3">
                <div className="flex">
                    <button title='Add step function'              className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white text-xs" onClick={() => setSelectedMode(selectionModeEnum.ADD_GENERATOR)}>Step</button>
                    <button title='Add dynamic plant'              className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white text-xs" onClick={() => setSelectedMode(selectionModeEnum.ADD_PLANT)}>Plant</button>
                    <button title='Add sum block'                  className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white text-xs" onClick={() => setSelectedMode(selectionModeEnum.ADD_SUM)}>Sum</button>
                    <button title='Add discrete PID block'         className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white text-xs" onClick={() => setSelectedMode(selectionModeEnum.ADD_DISCRETE_PID)}>PID</button>
                    <button title='Add modifier block'             className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white text-xs" onClick={() => setSelectedMode(selectionModeEnum.ADD_MODIFIER)}>Mod</button>
                    <button title='Add frequency selective filter' className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white text-xs" onClick={() => setSelectedMode(selectionModeEnum.ADD_FSFILTER)}>FLT</button>
                    {/* <button className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white text-xs" onClick={() => setSelectedMode(selectionModeEnum.ADD_FUSION)}>FSN</button> */}
                    <button title='Add display block'              className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white text-xs" onClick={() => setSelectedMode(selectionModeEnum.ADD_DISPLAY)}>🖥️</button>
                    <div className="m-1 h-10 w-1.5 bg-gray-300 w-[5px]"></div>
                    <button title='Add junction'                   className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white font-bold" onClick={() => setSelectedMode(selectionModeEnum.ADD_JUNCTION)}>&#9679;</button>
                    <button title='Remove element'                 className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white font-bold" onClick={() => setSelectedMode(selectionModeEnum.REMOVE)}>-</button>
                    <button title='Move element'                   className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white " onClick={() => setSelectedMode(selectionModeEnum.MOVE)}>&#10021;</button>
                    <button title='Make connection'                className="m-1 w-10 h-10 rounded bg-gray-500 hover:bg-gray-600 text-white font-bold " onClick={() => setSelectedMode(selectionModeEnum.MAKE_CONNECTION)}>&#8702;</button>
                    {showSimFinishMessage && <p className="text-green-600 mt-3 ml-4">Simluation Done!</p>}
                </div>
                <div>
                    {/* <button className="m-1 px-5 mx-2 h-10 rounded bg-gray-400 hover:bg-gray-500 text-white " onClick={null}>Export</button> */}
                    {plantExists && (
                        <>
                            <label>Ts:</label>
                            <input
                                type="number"
                                step={0.01}
                                min={0.001}
                                className="w-20 rounded ml-1 px-1"
                                value={Ts}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) setTs(val);
                                }}
                            />
                        </>
                    )}

                    <label className="ml-3">Steps:</label>
                    <input
                        type="number"
                        step={1}
                        min={100}
                        className="w-20 rounded ml-1 px-1"
                        value={simulationSteps}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) setSimulationSteps(val);
                        }}
                    />

                    <button className="m-1 px-5 mx-2 h-10 rounded bg-teal-500 hover:bg-teal-600 text-white " onClick={() => simulate(nodes, edgeList, setNodes, Ts, simulationSteps, setSimFinishTrigger)}>Simulate</button>
                </div>

            </div>
            <div
                ref={canvasRef}
                style={{ position: "relative", width: "100vw", height: "100vh" }}
                onClick={handleCanvasOnClick}
            >
                <svg
                    style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                    }}
                >
                    {edgeList.map(edge => {
                        const from = nodes.find(n => n.id == edge.from.id);
                        const to = nodes.find(n => n.id == edge.to.id);
                        const coords = NodeBase.getPortsCoordinates(from, to, edge);
                        return (
                            <React.Fragment key={`${from.id}->${to.id}`}>
                                <line
                                    stroke="black"
                                    strokeWidth={2}
                                    x1={coords.node1.x}
                                    y1={coords.node1.y}
                                    x2={coords.node2.x}
                                    y2={coords.node2.y}
                                />
                                <polygon
                                    points={NodeBase.getArrowPoints(from, to, edge.fromPos, edge.toPos)}
                                    stroke="black"
                                    strokeWidth={3}
                                />
                            </React.Fragment>
                        )
                    })}
                </svg>

                {nodes.map(node => (
                    <Node
                        key={node.id}
                        node={node}
                        setNodes={setNodes}
                        updatePosition={(newPosition) => {
                            updateNodePosition(node.id, newPosition);
                        }}
                        canvasRef={canvasRef}
                        selectedMode={selectedMode}
                        edgeList={edgeList}
                    />
                ))}

            </div>
        </>
    );

};
