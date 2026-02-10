import React, { useState, useCallback, use } from "react";
import { type FileWithPath, useDropzone } from "react-dropzone";
import { Button } from "../ui/button";

type FileUploaderProps = {
  fieldChange: (FILES: File[]) => void;
  mediaUrl: string;
};

// FileUploader.tsx（核心修改）

const FileUploader = ({ fieldChange, mediaUrl }: FileUploaderProps) => {
  const [fileUrls, setFileUrls] = useState<string[]>(
    mediaUrl ? [mediaUrl] : []
  );
  const [files, setFiles] = useState<FileWithPath[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      setFiles((prev) => {
        const next = [...prev, ...acceptedFiles];
        // 把所有选中的文件都传回表单（PostForm 里的 file: File[]）
        fieldChange(next as File[]);
        return next;
      });

      setFileUrls((prev) => [
        ...prev,
        ...acceptedFiles.map((f) => URL.createObjectURL(f)),
      ]);
    },
    [fieldChange]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,                // 允许多选
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
      {fileUrls.length > 0 ? (
        <>
          <div className="flex flex-wrap justify-center w-full p-5 lg:p-10 gap-4">
            {fileUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`image-${idx}`}
                className="file_uploader-img"
              />
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
