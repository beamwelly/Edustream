import os

# Define recordings directory path inside backend root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RECORDINGS_DIR = os.path.join(BASE_DIR, "recordings")
os.makedirs(RECORDINGS_DIR, exist_ok=True)

def save_recording(filename: str, byte_content: bytes) -> str:
    """
    Writes the MP4 byte content to the local recordings folder.
    """
    file_path = os.path.join(RECORDINGS_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(byte_content)
    return filename

def get_recording_path(filename: str) -> str:
    """
    Returns the absolute path to the local recording file.
    """
    return os.path.join(RECORDINGS_DIR, filename)
