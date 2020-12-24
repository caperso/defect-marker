import { fabric } from "fabric";
import { SOLAR_DEFECT_TYPES } from "../../../../assets/js/constants";
import { CanvasImageRatio, Coord2d, Defect } from "../../../../typings/interface";

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 450;
export const RATIO = 600 / 450;
const defaultPathConfig = {
  strokeWidth: 2,
  fill: "transparent",
  hasRotatingPoint: false,
  lockRotation: true,
  selectable: false,
  cornerSize: 6,
  transparentCorners: false,
  cornerColor: "white",
  borderColor: "white",
};

/**
 * 限制鼠标坐标, 防止过界
 * @export
 * @param {fabric.IEvent} e
 * @returns {Coord2d}
 */
export function restrictCoord(e: fabric.IEvent): Coord2d {
  let { x, y } = e.absolutePointer!;
  x = x < 0 ? 0 : x > CANVAS_WIDTH ? CANVAS_WIDTH : x;
  y = y < 0 ? 0 : y > CANVAS_HEIGHT ? CANVAS_HEIGHT : y;
  return [x, y];
}

export function drawRect(prevCoord: Coord2d, coord: Coord2d, color: string) {
  const x0 = prevCoord[0];
  const y0 = prevCoord[1];
  const x = coord[0];
  const y = coord[1];

  const drawPath: any = [["M", x0, y0], ["L", x, y0], ["L", x, y], ["L", x0, y], ["z"]];

  return new fabric.Path(drawPath, {
    stroke: color,
    ...defaultPathConfig,
  });
}

/**
 * 对任何fabric-object对象增加监听: 最终操作相应defect对象
 * @export
 * @param {fabric.Object} fabricObject
 * @param {(updatedDefect: Defect) => void} setter
 * @param {CanvasImageRatio} infraredRatio
 * @param {CanvasImageRatio} lightRatio
 */
export function addObjectListeners(
  fabricObject: fabric.Object,
  setter: (updatedDefect: Defect) => void,
  infraredRatio: CanvasImageRatio,
  lightRatio: CanvasImageRatio,
) {
  /**
   * fabric-object 变形动作监听
   * @param {fabric.IEvent} e
   */
  function transformCallbackAct(e: fabric.IEvent) {
    const { br, tl } = e.target!.aCoords!;
    // 方向: canvas坐标=>region实际坐标 所以除以比例
    const updatedRegion = `${tl.x / infraredRatio.x} ${tl.y / infraredRatio.y} ${br.x / infraredRatio.x} ${
      br.y / infraredRatio.y
    }`;
    const updatedLightRegion = `${tl.x / lightRatio.x} ${tl.y / lightRatio.y} ${br.x / lightRatio.x} ${
      br.y / lightRatio.y
    }`;
    const updatedDefect: Defect = { ...e.target!.data, region: updatedRegion, light_region: updatedLightRegion };
    setter(updatedDefect);
  }
  fabricObject.on("scaled", (e) => {
    transformCallbackAct(e);
    console.log("[fabric-object] scaled", { e });
  });
  fabricObject.on("moved", (e) => {
    transformCallbackAct(e);
    console.log("[fabric-object] moved", { e });
  });
}

export function getDefectPaths(defects: Defect[], infraredRatio: CanvasImageRatio, lightRatio: CanvasImageRatio) {
  const infraredPaths = defects.map((d) => {
    // a region likes "200 100 400 600"
    const seq = d.region.split(" ").map((s) => +s);
    const drawPath: any = [
      ["M", seq[0] * infraredRatio.x, seq[1] * infraredRatio.y],
      ["L", seq[2] * infraredRatio.x, seq[1] * infraredRatio.y],
      ["L", seq[2] * infraredRatio.x, seq[3] * infraredRatio.y],
      ["L", seq[0] * infraredRatio.x, seq[3] * infraredRatio.y],
      ["L", seq[0] * infraredRatio.x, seq[1] * infraredRatio.y],
      ["z"],
    ];

    const pathObject = new fabric.Path(drawPath, {
      ...defaultPathConfig,
      data: d,
      objectCaching: false,
      stroke: SOLAR_DEFECT_TYPES[d.defect_type!].color,
    });
    pathObject.setControlsVisibility({ mtr: false });

    return pathObject;
  });

  const lightPaths = defects.map((d) => {
    const seq = d.light_region.split(" ").map((s) => +s);
    const drawPath: any = [
      ["M", seq[0] * lightRatio.x, seq[1] * lightRatio.y],
      ["L", seq[2] * lightRatio.x, seq[1] * lightRatio.y],
      ["L", seq[2] * lightRatio.x, seq[3] * lightRatio.y],
      ["L", seq[0] * lightRatio.x, seq[3] * lightRatio.y],
      ["L", seq[0] * lightRatio.x, seq[1] * lightRatio.y],
      ["z"],
    ];

    const pathObject = new fabric.Path(drawPath, {
      ...defaultPathConfig,
      data: d,
      stroke: SOLAR_DEFECT_TYPES[d.defect_type!].color,
    });
    pathObject.setControlsVisibility({ mtr: false });

    return pathObject;
  });

  return { infraredPaths, lightPaths };
}

export function generateRegion(coord1: Coord2d, coord2: Coord2d, ratio: CanvasImageRatio) {
  return `${coord1[0] / ratio.x} ${coord1[1] / ratio.y} ${coord2[0] / ratio.x} ${coord2[1] / ratio.y}`;
}

/**
 * 关闭组缩放, 关闭上部旋转按钮
 * @export
 * @param {fabric.IEvent} e
 */
export function disableGroupScales(e: fabric.IEvent) {
  if ((e.target as any)["_objects"]) {
    e.target!.set({
      cornerSize: 0,
      lockScalingX: true,
      lockScalingY: true,
    });
    e.target?.setControlsVisibility({ mtr: false });
  }
}

export function generateDefect(region: string, lightRegion: string, typeIndex: number) {
  //! FAKE
  const defect: Defect = {
    altitude: "167.493",
    create_time: "2020-12-04 13:36:46",
    defect_type: typeIndex,
    flag: "",
    gps: "",
    homography: "",
    id: Math.floor(Math.random() * 10000),
    infrared_name: "DJI_0436_R.JPG",
    is_deleted: "0",
    latitude: "46.37528991733333",
    light_name: "DJI_0435.JPG",
    light_region: lightRegion,
    longitude: "125.189338684",
    mark: "",
    name: "",
    packet: 72,
    point: 1203,
    project: 7,
    region: region,
    update_time: "2020-12-04 13:36:46",
  };
  return defect;
}
