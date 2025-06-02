from supabase import create_client
import os

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

def upload_image(bucket_name: str, file_data, file_path: str):
    """
    Simple function to upload an image to a specified Supabase storage bucket.
    """
    try:
        # Upload to the specified bucket
        supabase.storage.from_(bucket_name).upload(
            file_path,
            file_data,
        )
        
        # Get the public URL for the uploaded file
        file_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
        
        return {
            'success': True,
            'url': file_url,
            'path': file_path
        }
    except Exception as e:
        print(f"Supabase upload error in bucket '{bucket_name}': {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def delete_image(bucket_name: str, file_path: str):
    """
    Delete an image from a specified Supabase storage bucket.
    """
    try:
        supabase.storage.from_(bucket_name).remove([file_path])
        return True
    except Exception as e:
        print(f"Supabase delete error in bucket '{bucket_name}': {str(e)}")
        return False