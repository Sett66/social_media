import React, { useCallback, useEffect, useMemo, useState } from "react";
import { type FileWithPath, useDropzone } from "react-dropzone";
import { Button } from "../ui/button";

type FileUploaderProps = {
  fieldChange: (FILES: File[]) => void;
  mediaUrls?: string[];
  onRemoveExisting?: (index: number) => void;
};

// FileUploader.tsx（核心修改）
const FileUploader = ({
  fieldChange,
  mediaUrls = [],
  onRemoveExisting,
}: FileUploaderProps) => {
  const [files, setFiles] = useState<FileWithPath[]>([]); //真正的新增文件对象数组，要提交到后端的文件本体
  const [newFileUrls, setNewFileUrls] = useState<string[]>([]);
  // 这些新增文件的本地预览URL数组，用来给前端展示的，通过URL.CreateObjectURL生成的临时URL

  // 把本地 state 中的 files 同步给 RHF 的 fieldChange，放在 effect 里避免「渲染期间更新父组件」的警告
  useEffect(() => {
    fieldChange(files as File[]);
  }, [files, fieldChange]);

  const allUrls = useMemo(
    () => [...mediaUrls, ...newFileUrls],
    [mediaUrls, newFileUrls],
  );

  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      setFiles((prev) => {
        // 新文件直接追加到files数组
        return [...prev, ...acceptedFiles];
      });
      // 同时生成新文件的预览url，并追加到newFileUrls数组
      setNewFileUrls((prev) => [
        ...prev,
        ...acceptedFiles.map((f) => URL.createObjectURL(f)),
      ]);
    },
    [fieldChange],
  ); // 也就是说用户选完图片就显示了预览图，其实还没有上传到云端，只有点击提交的时候才会正式上传

  const removeAt = useCallback(
    (index: number) => {
      const existingCount = mediaUrls.length;

      // remove existing (stored) image
      if (index < existingCount) {
        onRemoveExisting?.(index);
        return;
      }

      // remove newly selected file
      const newIndex = index - existingCount;
      setFiles((prev) => {
        const next = [...prev];
        next.splice(newIndex, 1);
        return next;
      });
      setNewFileUrls((prev) => {
        const next = [...prev];
        next.splice(newIndex, 1);
        return next;
      });
    },
    [fieldChange, mediaUrls.length, onRemoveExisting],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true, // 允许多选
    accept: {
      "image/*": [".jpeg", ".png", ".jpg", ".svg"],
    },
  });

  return (
    <div
      {...getRootProps()}
      className="flex flex-center flex-col bg-dark-3 rounded-xl cursor-pointer"
    >
      <input {...getInputProps()} className="curosr-point" />
      {allUrls.length > 0 ? (
        <>
          <div className="flex flex-wrap justify-center w-full p-5 lg:p-10 gap-4">
            {allUrls.map((url, idx) => (
              <div key={`${url}-${idx}`} className="relative">
                <img
                  src={url}
                  alt={`image-${idx}`}
                  className="file_uploader-img"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(idx);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-dark-4 text-light-1 flex items-center justify-center"
                  aria-label="remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="file_uploader-lable">
            Click or drag photos to add / replace
          </p>
        </>
      ) : (
        <div className="file_uploader-box">
          {/* 原来的占位内容不变 */}
          <img
            src="/assets/icons/file-upload.svg"
            width={96}
            height={77}
            alt="file_upload"
          />
          <h3 className="base-medium text-light-2 mb-2 mt-6">
            Drag photos here
          </h3>
          <p className="text-light-4 small-regular">SVG, PNG, JPG</p>
          <Button type="button" className="shad-button_dark_4">
            Select from computer
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
