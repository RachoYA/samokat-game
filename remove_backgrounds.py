import os
from PIL import Image

def remove_white_background(image_path):
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        new_data = []
        for item in datas:
            # Change all white (also shades of whites)
            # to transparent
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)

        img.putdata(new_data)
        img.save(image_path, "PNG")
        print(f"Processed: {image_path}")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

def process_directory(directory):
    for filename in os.listdir(directory):
        if filename.endswith(".png"):
            file_path = os.path.join(directory, filename)
            remove_white_background(file_path)

if __name__ == "__main__":
    sprites_dir = "frontend/public/sprites"
    if os.path.exists(sprites_dir):
        process_directory(sprites_dir)
        print("Background removal complete.")
    else:
        print(f"Directory not found: {sprites_dir}")
