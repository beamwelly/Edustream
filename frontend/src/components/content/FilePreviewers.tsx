import React, { useState, useEffect, useRef } from "react";
import mammoth from "mammoth";
import { Loader2, FileText, ImageIcon, Film, FileSpreadsheet, Presentation, Archive, File as FileIcon } from "lucide-react";
import * as XLSX from "xlsx";
import JSZip from "jszip";

import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Helper hook to check if component is client-side mounted
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(mounted => true);
  }, []);
  return mounted;
}

interface PDFThumbnailProps {
  url: string;
  className?: string;
  fallbackIcon: React.ReactNode;
}

export function PDFThumbnail({ url, className = "", fallbackIcon }: PDFThumbnailProps) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className={`flex items-center justify-center bg-muted/20 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center bg-red-50/50 relative overflow-hidden group ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />
      <div className="transform group-hover:scale-110 transition-transform duration-200">
        {fallbackIcon}
      </div>
      <span className="text-[10px] font-bold text-red-600/90 mt-2.5 tracking-wider bg-red-100/70 px-2 py-0.5 rounded-full uppercase font-mono">
        PDF Document
      </span>
    </div>
  );
}

interface DocxPreviewProps {
  url: string;
  className?: string;
}

export function DocxPreview({ url, className = "" }: DocxPreviewProps) {
  const mounted = useMounted();
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    let active = true;

    async function fetchAndRenderDocx() {
      try {
        setLoading(true);
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch Word document");
        
        const arrayBuffer = await response.arrayBuffer();
        if (!active) return;

        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (active) {
          setHtml(result.value);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error parsing DOCX:", err);
        if (active) {
          setError(err.message || "Failed to render Word document preview");
          setLoading(false);
        }
      }
    }

    fetchAndRenderDocx();
    return () => {
      active = false;
    };
  }, [url, mounted]);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground w-full h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm font-semibold">Converting Word document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 w-full h-full flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-blue-500 mb-2" />
        <p className="text-sm text-red-500 font-semibold">{error}</p>
        <p className="text-xs text-muted-foreground mt-1">Please download the file to view it.</p>
      </div>
    );
  }

  return (
    <div className={`prose prose-sm max-w-none bg-white p-8 border border-border shadow-sm rounded-md overflow-y-auto max-h-[70vh] w-full text-left text-slate-800 ${className}`}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

interface DocxThumbnailProps {
  url: string;
  className?: string;
  fallbackIcon: React.ReactNode;
}

export function DocxThumbnail({ url, className = "", fallbackIcon }: DocxThumbnailProps) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className={`flex items-center justify-center bg-muted/20 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center bg-blue-50/50 relative overflow-hidden group ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500" />
      <div className="transform group-hover:scale-110 transition-transform duration-200">
        {fallbackIcon}
      </div>
      <span className="text-[10px] font-bold text-blue-600/90 mt-2.5 tracking-wider bg-blue-100/70 px-2 py-0.5 rounded-full uppercase font-mono">
        Word Document
      </span>
    </div>
  );
}

export const getIconAndBadgeConfig = (type: string) => {
  const t = type.toUpperCase();
  if (t === "PDF") {
    return {
      icon: FileText,
      colorClass: "text-red-600",
      badgeClass: "bg-red-50 text-red-700 border-red-200",
      accentBg: "bg-red-50/50"
    };
  } else if (t === "DOC" || t === "DOCX") {
    return {
      icon: FileText,
      colorClass: "text-blue-600",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      accentBg: "bg-blue-50/50"
    };
  } else if (t === "XLS" || t === "XLSX") {
    return {
      icon: FileSpreadsheet,
      colorClass: "text-green-600",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
      accentBg: "bg-green-50/50"
    };
  } else if (t === "PPT" || t === "PPTX") {
    return {
      icon: Presentation,
      colorClass: "text-orange-600",
      badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
      accentBg: "bg-orange-50/50"
    };
  } else if (["PNG", "JPG", "JPEG", "GIF", "SVG", "IMAGE"].includes(t)) {
    return {
      icon: ImageIcon,
      colorClass: "text-cyan-600",
      badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
      accentBg: "bg-cyan-50/50"
    };
  } else if (["MP4", "AVI", "MOV", "WEBM", "VIDEO"].includes(t)) {
    return {
      icon: Film,
      colorClass: "text-purple-600",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      accentBg: "bg-purple-50/50"
    };
  } else if (["ZIP", "RAR", "TAR", "GZ", "7Z", "ARCHIVE"].includes(t)) {
    return {
      icon: Archive,
      colorClass: "text-slate-500",
      badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
      accentBg: "bg-slate-50/50"
    };
  } else {
    return {
      icon: FileIcon,
      colorClass: "text-slate-600",
      badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
      accentBg: "bg-slate-50/50"
    };
  }
};

// ==========================================
// EXCEL (XLSX / XLS) PREVIEW & THUMBNAIL
// ==========================================

// Helper functions for namespace-insensitive XML element retrieval
const getXmlElements = (parent: Document | Element, localName: string, prefixDefault: string): Element[] => {
  if (typeof parent.getElementsByTagNameNS === "function") {
    return Array.from(parent.getElementsByTagNameNS("*", localName));
  }
  return Array.from(parent.getElementsByTagName(prefixDefault));
};

const getFirstXmlElement = (parent: Document | Element, localName: string, prefixDefault: string): Element | null => {
  const elements = getXmlElements(parent, localName, prefixDefault);
  return elements.length > 0 ? elements[0] : null;
};

// Safely resolve XLSX library references
const getXlsxLib = () => {
  const xlsxLib: any = XLSX;
  if (xlsxLib && typeof xlsxLib.read === "function") return xlsxLib;
  if (xlsxLib && xlsxLib.default && typeof xlsxLib.default.read === "function") return xlsxLib.default;
  return xlsxLib;
};

// Safely resolve JSZip library references
const getJSZipLib = () => {
  const jszipLib: any = JSZip;
  if (jszipLib && typeof jszipLib.loadAsync === "function") return jszipLib;
  if (jszipLib && jszipLib.default && typeof jszipLib.default.loadAsync === "function") return jszipLib.default;
  return jszipLib;
};

interface XlsxPreviewProps {
  url: string;
  className?: string;
}

export function XlsxPreview({ url, className = "" }: XlsxPreviewProps) {
  const mounted = useMounted();
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    let active = true;

    async function loadExcel() {
      try {
        setLoading(true);
        const cacheKey = `xlsx_full_${url}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error("Failed to fetch spreadsheet");
        const arrayBuffer = await res.arrayBuffer();
        if (!active) return;

        const xlsxLib = getXlsxLib();
        const workbook = xlsxLib.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error("Sheet is empty");

        const range = xlsxLib.utils.decode_range(sheet["!ref"] || "A1:J20");
        const maxRow = Math.min(range.e.r, range.s.r + 39); // up to 40 rows
        const maxCol = Math.min(range.e.c, range.s.c + 11); // up to 12 columns

        const rows: string[][] = [];
        for (let r = range.s.r; r <= maxRow; r++) {
          const rowCells: string[] = [];
          for (let c = range.s.c; c <= maxCol; c++) {
            const cellRef = xlsxLib.utils.encode_cell({ r, c });
            const cell = sheet[cellRef];
            rowCells.push(cell ? String(cell.v ?? "") : "");
          }
          rows.push(rowCells);
        }

        if (active) {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(rows));
          } catch (e) {
            console.warn("Failed to save to sessionStorage:", e);
          }
          setData(rows);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error parsing Excel preview:", err);
        if (active) {
          setError(err.message || "Failed to render Excel preview");
          setLoading(false);
        }
      }
    }

    loadExcel();
    return () => {
      active = false;
    };
  }, [url, mounted]);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground w-full h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm font-semibold">Reading spreadsheet...</p>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="text-center p-6 w-full h-full flex flex-col items-center justify-center">
        <FileSpreadsheet className="h-12 w-12 text-green-500 mb-2" />
        <p className="text-sm text-red-500 font-semibold">{error || "Excel file is empty"}</p>
        <p className="text-xs text-muted-foreground mt-1">Please download the file to view it.</p>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-auto max-h-[70vh] bg-white border border-border shadow-sm rounded-md p-4 ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 text-left text-xs font-mono">
        <thead className="bg-gray-50 text-gray-500 font-semibold uppercase">
          <tr>
            <th className="p-2 border-r border-b border-gray-200 bg-gray-100 text-center w-8">#</th>
            {data[0]?.map((_, idx) => (
              <th key={idx} className="p-2 border-r border-b border-gray-200">
                {String.fromCharCode(65 + idx)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white text-gray-700 border-b border-gray-200">
          {data.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50">
              <td className="p-2 border-r border-gray-200 bg-gray-50 text-center font-bold text-gray-400">{rIdx + 1}</td>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="p-2 border-r border-gray-200 max-w-[150px] truncate" title={cell}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface XlsxThumbnailProps {
  url: string;
  className?: string;
  fallbackIcon: React.ReactNode;
}

export function XlsxThumbnail({ url, className = "", fallbackIcon }: XlsxThumbnailProps) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className={`flex items-center justify-center bg-muted/20 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center bg-emerald-50/50 relative overflow-hidden group ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
      <div className="transform group-hover:scale-110 transition-transform duration-200">
        {fallbackIcon}
      </div>
      <span className="text-[10px] font-bold text-emerald-600/90 mt-2.5 tracking-wider bg-emerald-100/70 px-2 py-0.5 rounded-full uppercase font-mono">
        Excel Sheet
      </span>
    </div>
  );
}

// ==========================================
// POWERPOINT (PPTX / PPT) PREVIEW & THUMBNAIL
// ==========================================

interface PptxSlideData {
  texts: {
    text: string;
    x: number;
    y: number;
    w: number;
    h: number;
    fontSize?: number;
    bold?: boolean;
    color?: string;
  }[];
  backgroundColor: string;
  image?: string;
}

interface PptxPreviewProps {
  url: string;
  className?: string;
}

export function PptxPreview({ url, className = "" }: PptxPreviewProps) {
  const mounted = useMounted();
  const [data, setData] = useState<PptxSlideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    let active = true;

    async function loadPptx() {
      try {
        setLoading(true);
        const cacheKey = `pptx_${url}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error("Failed to fetch presentation");
        const arrayBuffer = await res.arrayBuffer();
        if (!active) return;

        const jszipLib = getJSZipLib();
        const zip = await jszipLib.loadAsync(arrayBuffer);
        const slideXmlFile = zip.file("ppt/slides/slide1.xml");
        if (!slideXmlFile) throw new Error("Could not find slide 1 in presentation");
        const slideXmlText = await slideXmlFile.async("text");

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(slideXmlText, "text/xml");

        // Parse shapes
        const textElements: any[] = [];
        const shapes = getXmlElements(xmlDoc, "sp", "p:sp");
        for (let i = 0; i < shapes.length; i++) {
          const shape = shapes[i];

          let x = 0, y = 0, cx = 0, cy = 0;
          const off = getFirstXmlElement(shape, "off", "a:off");
          const ext = getFirstXmlElement(shape, "ext", "a:ext");
          if (off) {
            x = parseInt(off.getAttribute("x") || "0", 10);
            y = parseInt(off.getAttribute("y") || "0", 10);
          }
          if (ext) {
            cx = parseInt(ext.getAttribute("cx") || "0", 10);
            cy = parseInt(ext.getAttribute("cy") || "0", 10);
          }

          const paragraphs = getXmlElements(shape, "p", "a:p");
          let shapeText = "";
          let bold = false;
          let color = "";
          let fontSize = 0;

          for (let j = 0; j < paragraphs.length; j++) {
            const p = paragraphs[j];
            const runs = getXmlElements(p, "r", "a:r");
            for (let k = 0; k < runs.length; k++) {
              const r = runs[k];
              const t = getFirstXmlElement(r, "t", "a:t");
              if (t && t.textContent) {
                shapeText += t.textContent + " ";
              }

              const rPr = getFirstXmlElement(r, "rPr", "a:rPr");
              if (rPr) {
                if (rPr.getAttribute("b") === "1") bold = true;
                const sz = rPr.getAttribute("sz");
                if (sz) fontSize = parseInt(sz, 10) / 100;

                const solidFill = getFirstXmlElement(rPr, "solidFill", "a:solidFill");
                if (solidFill) {
                  const srgbClr = getFirstXmlElement(solidFill, "srgbClr", "a:srgbClr");
                  if (srgbClr) {
                    color = "#" + srgbClr.getAttribute("val");
                  }
                }
              }
            }
          }

          if (shapeText.trim()) {
            textElements.push({
              text: shapeText.trim(),
              x: x / 914400,
              y: y / 914400,
              w: cx / 914400,
              h: cy / 914400,
              fontSize: fontSize || 14,
              bold,
              color: color || "#334155"
            });
          }
        }

        // Parse slide background color
        let backgroundColor = "#ffffff";
        const bgPr = getFirstXmlElement(xmlDoc, "bgPr", "p:bgPr") || getFirstXmlElement(xmlDoc, "bg", "p:bg");
        if (bgPr) {
          const solidFill = getFirstXmlElement(bgPr, "solidFill", "a:solidFill");
          if (solidFill) {
            const srgbClr = getFirstXmlElement(solidFill, "srgbClr", "a:srgbClr");
            if (srgbClr) {
              backgroundColor = "#" + srgbClr.getAttribute("val");
            }
          }
        }

        // Parse slide background image relations if any
        let mainImage = "";
        const picElements = getXmlElements(xmlDoc, "pic", "p:pic");
        if (picElements.length > 0) {
          const relsFile = zip.file("ppt/slides/_rels/slide1.xml.rels");
          if (relsFile) {
            const relsText = await relsFile.async("text");
            const relsDoc = parser.parseFromString(relsText, "text/xml");
            const relationships = getXmlElements(relsDoc, "Relationship", "Relationship");

            for (let i = 0; i < picElements.length; i++) {
              const blip = getFirstXmlElement(picElements[i], "blip", "a:blip");
              if (blip) {
                let embedId = blip.getAttribute("r:embed") || blip.getAttribute("embed");
                if (!embedId) {
                  for (let attrIdx = 0; attrIdx < blip.attributes.length; attrIdx++) {
                    const attr = blip.attributes[attrIdx];
                    if (attr.nodeName.endsWith("embed")) {
                      embedId = attr.nodeValue;
                      break;
                    }
                  }
                }
                if (embedId) {
                  for (let j = 0; j < relationships.length; j++) {
                    const rel = relationships[j];
                    if (rel.getAttribute("Id") === embedId) {
                      let target = rel.getAttribute("Target") || "";
                      if (target.startsWith("../")) {
                        target = target.substring(3);
                      }
                      const mediaFile = zip.file(`ppt/${target}`);
                      if (mediaFile) {
                        const mediaBase64 = await mediaFile.async("base64");
                        const mimeType = target.endsWith(".png") ? "image/png" : "image/jpeg";
                        mainImage = `data:${mimeType};base64,${mediaBase64}`;
                        break;
                      }
                    }
                  }
                }
              }
              if (mainImage) break;
            }
          }
        }

        const result: PptxSlideData = {
          texts: textElements,
          backgroundColor,
          image: mainImage
        };

        if (active) {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(result));
          } catch (e) {
            console.warn("Failed to save to sessionStorage:", e);
          }
          setData(result);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error parsing PPTX:", err);
        if (active) {
          setError(err.message || "Failed to render PowerPoint presentation");
          setLoading(false);
        }
      }
    }

    loadPptx();
    return () => {
      active = false;
    };
  }, [url, mounted]);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground w-full h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm font-semibold">Generating slide preview...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center p-6 w-full h-full flex flex-col items-center justify-center">
        <Presentation className="h-12 w-12 text-orange-500 mb-2" />
        <p className="text-sm text-red-500 font-semibold">{error || "PowerPoint presentation is empty"}</p>
        <p className="text-xs text-muted-foreground mt-1">Please download the file to view it.</p>
      </div>
    );
  }

  const slideWidth = 13.33;
  const slideHeight = 7.5;

  return (
    <div className={`w-full max-w-2xl aspect-[16/9] relative border border-border shadow-md rounded-md overflow-hidden bg-white select-none ${className}`} style={{ backgroundColor: data.backgroundColor }}>
      {data.image && (
        <img src={data.image} alt="Slide background" className="absolute inset-0 w-full h-full object-contain" />
      )}
      {data.texts.map((el, idx) => {
        const leftPercent = (el.x / slideWidth) * 100;
        const topPercent = (el.y / slideHeight) * 100;
        const widthPercent = (el.w / slideWidth) * 100;
        const heightPercent = (el.h / slideHeight) * 100;
        
        return (
          <div
            key={idx}
            className="absolute text-left leading-normal leading-snug break-words"
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              width: `${widthPercent}%`,
              height: `${heightPercent}%`,
              fontSize: `calc(${el.fontSize}px * 0.9)`,
              fontWeight: el.bold ? "bold" : "normal",
              color: el.color
            }}
          >
            {el.text}
          </div>
        );
      })}
    </div>
  );
}

interface PptxThumbnailProps {
  url: string;
  className?: string;
  fallbackIcon: React.ReactNode;
}

export function PptxThumbnail({ url, className = "", fallbackIcon }: PptxThumbnailProps) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className={`flex items-center justify-center bg-muted/20 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center bg-orange-50/50 relative overflow-hidden group ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-500" />
      <div className="transform group-hover:scale-110 transition-transform duration-200">
        {fallbackIcon}
      </div>
      <span className="text-[10px] font-bold text-orange-600/90 mt-2.5 tracking-wider bg-orange-100/70 px-2 py-0.5 rounded-full uppercase font-mono">
        PowerPoint
      </span>
    </div>
  );
}
