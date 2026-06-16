import sys
import os
import mammoth

def convert_docx_to_html(docx_path, html_path):
    if not os.path.exists(docx_path):
        print(f"Error: {docx_path} does not exist.")
        sys.exit(1)
        
    with open(docx_path, "rb") as docx_file:
        result = mammoth.convert_to_html(docx_file)
        html_body = result.value
        
    # Inject CSS styles to render the CV cleanly as a professional page layout
    styles = """
    <style>
      @page {
        size: A4;
        margin: 20mm;
      }
      body {
        font-family: 'Arial', sans-serif;
        color: #1e293b;
        line-height: 1.45;
        font-size: 10pt;
        margin: 0;
        padding: 0;
      }
      p {
        margin-top: 0;
        margin-bottom: 6px;
        text-align: justify;
      }
      h1, h2, h3, h4 {
        color: #0f172a;
        margin-top: 14px;
        margin-bottom: 6px;
        font-weight: 700;
      }
      h1 {
        font-size: 13pt;
        border-bottom: 1.5px solid #1e3a8a;
        padding-bottom: 3px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      ul {
        margin-top: 0;
        margin-bottom: 8px;
        padding-left: 20px;
      }
      li {
        margin-bottom: 3.5px;
      }
      strong {
        color: #0f172a;
      }
    </style>
    """
    
    full_html = f"""<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>CV</title>
      {styles}
    </head>
    <body>
      {html_body}
    </body>
    </html>
    """
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(full_html)
    print(f"Successfully converted docx to HTML at: {html_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 docx_to_html.py <input_docx> <output_html>")
        sys.exit(1)
        
    input_docx = sys.argv[1]
    output_html = sys.argv[2]
    convert_docx_to_html(input_docx, output_html)
