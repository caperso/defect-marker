import { render } from "react-dom";
import {
  LeftOutlined,
  QuestionCircleOutlined,
  RightOutlined
} from "@ant-design/icons";
import { message, Tooltip } from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SOLAR_DEFECT_TYPES } from "./methods";
import { FAKE_DEFECTS, FAKE_IMG_GROUP } from "./FAKES";
import { Defect } from "./interface";
import "./DefectEditor.scss";
import { EditorCore } from "./EditorCore";
import Modal from "antd/lib/modal/Modal";

const tips = (
  <div>
    <p>
      1.在左栏选择缺陷, 即可在<em>红外图片</em>上绘制相应缺陷标识
    </p>
    <p>
      2.在右栏选择操作, 即可对<em>红外图片</em>上缺陷标识进行处理
    </p>
    <p>3.在图片上,使用鼠标滚轮缩放图片</p>
    <p>4.可使用方向键"←" "→" 来切换上/下一张图片</p>
  </div>
);

export const DefectEditor = () => {
  const images = FAKE_IMG_GROUP;
  const defectList = FAKE_DEFECTS;
  const [currentImage, setCurrentImage] = useState(images[0]);
  const [editorVisible, setEditorVisible] = useState(true);
  const [currentDefectIndex, setCurrentDefectIndex] = useState<
    number | undefined
  >(undefined);

  const core = useRef<any>();
  const loading = useRef<boolean>(false);

  const closeModal = () => {
    setEditorVisible(false);
  };

  const selectDefect = (index: number) => {
    setCurrentDefectIndex(index);
  };

  const selectMode = () => {
    setCurrentDefectIndex(undefined);
  };

  const resetBackground = () => core.current?.resetBackground();

  const duplicateSelection = () => {
    core.current?.duplicateSelection();
    setCurrentDefectIndex(undefined);
  };

  const removeSelection = () => {
    core.current?.removeSelection();
    setCurrentDefectIndex(undefined);
  };

  // 根据图片信息建立缺陷池
  const [defects, setDefects] = useState<Defect[]>([]);
  useEffect(() => {
    if (currentImage) {
      const infraredName = currentImage.infraredName;

      const defects = defectList.filter(
        (d) => d.infrared_name === infraredName
      );
      setDefects(defects);
    }
  }, [currentImage, defectList]);

  const to = useCallback(
    (direct: number) => {
      const index = images.findIndex((image) => currentImage === image);
      if (index + direct >= images.length || index + direct < 0) {
        message.destroy();
        message.info("已到头");
      } else {
        loading.current = true;
        setCurrentImage(images[index + direct]);
      }
    },
    [images, currentImage]
  );

  // 注册快捷键
  useEffect(() => {
    const handler = (e: any) => {
      e.key === "ArrowLeft" && to(-1);
      e.key === "ArrowRight" && to(+1);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [to, loading]);

  // 渲染类别
  const renderDefectItems = () =>
    SOLAR_DEFECT_TYPES.map((item, index) => (
      <div
        onClick={() => selectDefect(index)}
        className={`item ${currentDefectIndex === index ? "selected" : ""}`}
        style={{ color: item.color }}
        key={item.key}
      >
        {item.title}
      </div>
    ));

  function closeLoading() {
    loading.current = false;
  }

  return editorVisible ? (
    <Modal
      visible={editorVisible}
      footer={null}
      destroyOnClose={true}
      onCancel={closeModal}
      forceRender={true}
      width="1350px"
      style={{ top: "6%" }}
      className="defect-editor-wrapper"
    >
      <div className="editor-header">
        <h1 className="name">航点:{currentImage.infraredName}</h1>
        <h2 className="create-date">拍摄时间:{currentImage.createDate}</h2>
        <h2 className="update-date">修改时间:{currentImage.updateDate}</h2>
        <Tooltip className="tips" placement="bottom" overlay={tips}>
          <QuestionCircleOutlined />
        </Tooltip>
      </div>
      <div className="editor-options">
        <div className="items">
          {renderDefectItems()}
          <div
            onClick={selectMode}
            className={`item ${
              currentDefectIndex === undefined ? "selected" : ""
            }`}
          >
            缺陷选择
          </div>
        </div>
        <div className="actions">
          <div onClick={duplicateSelection} className={`item`}>
            缺陷复制
          </div>
          <div onClick={removeSelection} className={`item`}>
            缺陷删除
          </div>
          <div onClick={resetBackground} className={`item`}>
            图片复位
          </div>
        </div>
      </div>

      <div className="main">
        {/* {loading.current && <Loading content="" />} */}
        <div className="image-controls">
          <div className="prev" onClick={() => to(-1)}>
            <LeftOutlined />
          </div>
          {/* 画布 */}
          <EditorCore
            ref={core}
            defects={defects}
            setDefects={setDefects}
            currentImage={currentImage}
            currentDefect={
              currentDefectIndex === undefined
                ? undefined
                : SOLAR_DEFECT_TYPES[currentDefectIndex]
            }
            onLoaded={closeLoading}
          />
          <div className="next" onClick={() => to(+1)}>
            <RightOutlined />
          </div>
        </div>
        <textarea
          id="brief-editor"
          className="editor-brief"
          placeholder="备注:"
        />
      </div>
    </Modal>
  ) : null;
};

const rootElement = document.getElementById("root");

render(<DefectEditor />, rootElement);
