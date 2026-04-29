import sys
from pdf2docx import Converter

def convert_pdf_to_docx(pdf_path, docx_path):
    cv = Converter(pdf_path)
    cv.convert(docx_path)
    cv.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python convert_pdf_to_docx.py <input_pdf> <output_docx>")
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_docx = sys.argv[2]

    try:
        convert_pdf_to_docx(input_pdf, output_docx)
        print(f"Successfully converted {input_pdf} to {output_docx}")
    except Exception as e:
        print(f"Error during conversion: {e}")
        sys.exit(1)
