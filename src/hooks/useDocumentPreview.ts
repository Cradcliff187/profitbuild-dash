import { useState } from 'react';
import { detectFileType, detectOfficeSubtype } from '@/utils/documentFileType';

interface PreviewState {
  // PDF
  pdfOpen: boolean;
  pdfUrl: string | null;
  pdfFileName: string;
  // Image
  imageOpen: boolean;
  imageUrl: string | null;
  // Video
  videoOpen: boolean;
  videoUrl: string | null;
  // Office
  officeOpen: boolean;
  officeUrl: string | null;
  officeFileName: string;
  officeFileType: 'word' | 'excel' | 'powerpoint' | undefined;
  // Receipt
  receiptOpen: boolean;
  receiptUrl: string | null;
}

export interface UseDocumentPreviewReturn extends PreviewState {
  openPreview: (params: {
    fileUrl: string;
    fileName?: string;
    mimeType?: string | null;
    isReceipt?: boolean;
  }) => void;
  closeAll: () => void;
  // Setters for individual modals (needed for controlled close)
  setPdfOpen: (open: boolean) => void;
  setImageOpen: (open: boolean) => void;
  setVideoOpen: (open: boolean) => void;
  setOfficeOpen: (open: boolean) => void;
  setReceiptOpen: (open: boolean) => void;
}

export function useDocumentPreview(): UseDocumentPreviewReturn {
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');

  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [officeOpen, setOfficeOpen] = useState(false);
  const [officeUrl, setOfficeUrl] = useState<string | null>(null);
  const [officeFileName, setOfficeFileName] = useState('');
  const [officeFileType, setOfficeFileType] = useState<'word' | 'excel' | 'powerpoint' | undefined>();

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const openPreview = ({
    fileUrl,
    fileName = '',
    mimeType = null,
    isReceipt = false,
  }: {
    fileUrl: string;
    fileName?: string;
    mimeType?: string | null;
    isReceipt?: boolean;
  }) => {
    if (isReceipt) {
      setReceiptUrl(fileUrl);
      setReceiptOpen(true);
      return;
    }

    const fileType = detectFileType(mimeType, fileUrl, fileName);

    switch (fileType) {
      case 'pdf':
        setPdfUrl(fileUrl);
        setPdfFileName(fileName);
        setPdfOpen(true);
        break;
      case 'image':
        setImageUrl(fileUrl);
        setImageOpen(true);
        break;
      case 'video':
        setVideoUrl(fileUrl);
        setVideoOpen(true);
        break;
      case 'office':
        setOfficeUrl(fileUrl);
        setOfficeFileName(fileName);
        setOfficeFileType(detectOfficeSubtype(mimeType, fileUrl, fileName));
        setOfficeOpen(true);
        break;
      default:
        // Fallback: open in new tab
        window.open(fileUrl, '_blank');
        break;
    }
  };

  const closeAll = () => {
    setPdfOpen(false);
    setImageOpen(false);
    setVideoOpen(false);
    setOfficeOpen(false);
    setReceiptOpen(false);
  };

  return {
    pdfOpen, pdfUrl, pdfFileName,
    imageOpen, imageUrl,
    videoOpen, videoUrl,
    officeOpen, officeUrl, officeFileName, officeFileType,
    receiptOpen, receiptUrl,
    openPreview,
    closeAll,
    setPdfOpen, setImageOpen, setVideoOpen, setOfficeOpen, setReceiptOpen,
  };
}
