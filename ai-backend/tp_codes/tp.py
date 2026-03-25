import base64
import json
import mimetypes
import tempfile
from pathlib import Path

from IPython.display import Markdown, display
from PIL import Image, ImageDraw
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI()

def image_to_data_url(image_path: str | Path) -> str:
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    mime_type = mimetypes.guess_type(path.name)[0] or "image/png"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"

handwriting_prompt = """
You are an assistant for extracting information from the document provided.
and explain the content and give very detailed analysis.
"""

handwritten_form_path = "./files/Code_Generated_Image.png"
handwriting_response = client.responses.create(
    model="gpt-4o-mini",
    input=[
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": handwriting_prompt},
                {
                    "type": "input_image",
                    "image_url": image_to_data_url(handwritten_form_path),
                    "detail": "original",
                },
            ],
        }
    ],
)
print(handwriting_response.output_text)