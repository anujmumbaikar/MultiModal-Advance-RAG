import base64
from openai import OpenAI
from dotenv import load_dotenv
from unstructured.documents.elements import Text,Element,FigureCaption,Image,Table,CompositeElement
from unstructured.chunking.title import chunk_by_title
from unstructured.partition.auto import partition
load_dotenv()

client = OpenAI()

def process_images_with_caption(raw_chunks,use_openai=True):
    processed_image = []
    for idx, chunk in enumerate(raw_chunks):
        if isinstance(chunk, Image):
            # the next element after the image will be figure caption
            if idx + 1 < len(raw_chunks) and isinstance(raw_chunks[idx + 1], FigureCaption):
                caption = raw_chunks[idx + 1].text
            else:
                caption = "No caption found"

            image_data = {
                # "index": idx, no need of index , when we will put into vector database 
                # we can take anything which we feel it is best for retrival
                "caption": caption if caption else "No caption found",
                "image_text": chunk.text,
                "base64": chunk.metadata.image_base64,
                "page_number": chunk.metadata.page_number,
                "content":chunk.text,
                "content_type": "image",
                "filename": chunk.metadata.filename
            }
            if use_openai:
                prompt = f"""
                Generate and describe the image in detail. 
                The caption of image is {image_data['caption']} and the image text is {image_data['image_text']}
                Directly analyze the image and provide a detailed description without any additional text.
                max characters should be 100-150 words.

                """
                response = client.chat.completions.create(
                    model="gpt-4.1",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/png;base64,{image_data['base64']}"},
                                },
                            ],
                        }
                    ],
                )
                image_data["content"] = response.choices[0].message.content
            processed_image.append(image_data)
    return processed_image



def process_tables_with_description(raw_chunks,use_openai=True):
    processed_tables = []
    for idx , element in enumerate(raw_chunks):
        if isinstance(element, Table):
            table_data = {
                "table_as_html":element.metadata.text_as_html,
                "table_text": element.text,
                "content": element.text,
                "content_type": "table",
                "filename": element.metadata.filename,
                "page_number": element.metadata.page_number
            }
            if use_openai:
                prompt = f"""
                    Generate and describe the table in detailed descriptiton of its contents , includding the strucutre, 
                    key data points , notable treands or insights 
                    The table is {table_data['table_as_html']}
                    Directly analyze the table and provide a detailed description without any additional text.
                    max characters should be 100-150 words.
                    """
                response = client.chat.completions.create(
                        model="gpt-4.1",
                        messages=[
                            {
                                "role": "user",
                                "content": prompt,
                            }
                        ],
                    )
                table_data["content"] = response.choices[0].message.content
            processed_tables.append(table_data)
    return processed_tables

def process_text_chunks(raw_chunks):
    processed_texts = []

    chunks = chunk_by_title(
        elements=[chunk for chunk in raw_chunks if isinstance(chunk, Text)],
        new_after_n_chars=1500,
        max_characters=2000,
        combine_text_under_n_chars=500,
    )
    for chunk in chunks:
        text_data = {
            "content": chunk.text,
            "content_type": "text",
            "filename": chunk.metadata.filename,
            "page_number": chunk.metadata.page_number
        }
        processed_texts.append(text_data)   
    return processed_texts


def get_all_chunks(file_path):
    print(f"Extracting raw chunks from the document")
    raw_chunks = partition(
        filename=file_path,
        strategy="hi_res",
        infer_table_structure=True,
        extract_image_block_types=["figure", "table", "Image"],
        extract_image_block_to_payload=True,
    )
    print(f"Image processing started")
    images = process_images_with_caption(raw_chunks)
    print(f"Table processing started")
    tables = process_tables_with_description(raw_chunks)
    print(f"Text processing started")
    texts = process_text_chunks(raw_chunks)
    print(f"Processing completed for all chunk types")

    print(f"Total {len(images)} images, {len(tables)} tables and {len(texts)} text chunks processed from the document")

    return images + tables + texts
