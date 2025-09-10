import React, {useState, useCallback, use} from 'react'
import { type FileWithPath, useDropzone} from 'react-dropzone'

type FileUploaderProps = {
  fieldChange:(FILES :File[])=>void;
  mediaUrl:string;
}

const FileUploader = ({ fieldChange ,mediaUrl}:FileUploaderProps) => {

  const [fileUrl, setFileUrl]=useState(mediaUrl);
  const [file, setFile]=useState<File[]>([]);

  const onDrop = useCallback(
    (acceptedFiles:FileWithPath[]) => {
      setFile(acceptedFiles);
      fieldChange(acceptedFiles);
      setFileUrl(URL.createObjectURL(acceptedFiles[0]));
    }, [file])
  const {getRootProps, getInputProps,} = useDropzone({
    onDrop,
    accept:{
      'image/*':['.jpeg','.png','.jpg','.svg']
    }})

  return (
    <div {...getRootProps()} className="flex flex-center flex-col bg-dark-3 rounded-xl cursor-pointer">
      <input {...getInputProps()} className='curosr-point' />
      {
        fileUrl ?(
          <>
          <div className='flex flex-1 justify-center w-full p-5 lg:p-10'>
            <img src={fileUrl} alt='image' className='file_uploader-img'/>
          </div>
          <p className='file_uploader-lable'>Click or drag photo to replace</p>
          </>
          ):
          <div className='file_uploader-box'>
            <img src='/assets/icons/file-upload.svg' width={96} height={77} alt='file_upload'/>
            <h3 className='base-medium text-light-2 mb-2 mt-6'>Drag photo here</h3>
            <p className='text-light-4 small-regular'>SVG,PNG,JPG</p>
            <button className='shad-button_dark_4'>Select from computer</button>
          </div>
      }
    </div>
  )
}

export default FileUploader