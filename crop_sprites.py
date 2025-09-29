#!/usr/bin/env python3
"""
Sprite Cropping Tool for RPG Game
Automatically removes transparent/empty pixels around sprites to improve alignment and reduce file size.
"""

import os
import sys
from PIL import Image, ImageChops
import argparse
from pathlib import Path

def get_bounding_box(image, alpha_threshold=10):
    """
    Get the bounding box of non-transparent pixels in an image.
    Only considers pixels with alpha > threshold as "visible".
    Returns (left, top, right, bottom) or None if image is completely transparent.
    """
    if image.mode != 'RGBA':
        # Convert to RGBA if not already
        image = image.convert('RGBA')
    
    # Get image data as numpy-like array
    width, height = image.size
    pixels = list(image.getdata())
    
    # Find bounds of pixels with alpha > threshold
    left = width
    top = height  
    right = 0
    bottom = 0
    
    found_pixel = False
    
    for y in range(height):
        for x in range(width):
            pixel_index = y * width + x
            r, g, b, a = pixels[pixel_index]
            
            if a > alpha_threshold:  # Pixel is visible enough
                found_pixel = True
                left = min(left, x)
                right = max(right, x + 1)  # +1 because crop uses exclusive right/bottom
                top = min(top, y)
                bottom = max(bottom, y + 1)  # +1 because crop uses exclusive right/bottom
    
    if not found_pixel:
        return None
        
    return (left, top, right, bottom)

def crop_sprite(input_path, output_path=None, backup=True, alpha_threshold=10):
    """
    Crop a single sprite image to remove transparent borders.
    
    Args:
        input_path (str): Path to input image
        output_path (str): Path for output image (defaults to overwrite input)
        backup (bool): Whether to create backup of original
        alpha_threshold (int): Alpha threshold for considering pixels visible
    
    Returns:
        tuple: (success, message, (original_size, new_size))
    """
    try:
        # Open the image
        with Image.open(input_path) as img:
            original_size = img.size
            
            # Get bounding box of non-transparent pixels
            bbox = get_bounding_box(img, alpha_threshold)
            
            if bbox is None:
                return False, f"Image is completely transparent: {input_path}", (original_size, original_size)
            
            left, top, right, bottom = bbox
            
            # Check if cropping is needed
            if left == 0 and top == 0 and right == img.width and bottom == img.height:
                return True, f"No cropping needed: {input_path}", (original_size, original_size)
            
            # Crop the image
            cropped = img.crop(bbox)
            new_size = cropped.size
            
            # Determine output path
            if output_path is None:
                output_path = input_path
                
                # Create backup if requested
                if backup:
                    backup_path = input_path.replace('.png', '_original.png')
                    if not os.path.exists(backup_path):
                        img.save(backup_path)
            
            # Save cropped image
            cropped.save(output_path, 'PNG', optimize=True)
            
            saved_pixels = (original_size[0] * original_size[1]) - (new_size[0] * new_size[1])
            percentage_saved = (saved_pixels / (original_size[0] * original_size[1])) * 100
            
            return True, f"Cropped: {input_path} | {original_size} -> {new_size} | {percentage_saved:.1f}% pixels saved", (original_size, new_size)
            
    except Exception as e:
        return False, f"Error processing {input_path}: {str(e)}", (None, None)

def find_sprite_files(directory):
    """Find all PNG files in the directory and subdirectories."""
    sprite_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith('.png') and not file.endswith('_original.png'):
                sprite_files.append(os.path.join(root, file))
    return sprite_files

def test_crop(input_path):
    """Test function to verify cropping removes ALL transparent borders."""
    try:
        with Image.open(input_path) as img:
            print(f"\nTesting: {input_path}")
            print(f"Original size: {img.size}")
            
            bbox = get_bounding_box(img)
            if bbox:
                left, top, right, bottom = bbox
                print(f"Content bounds: left={left}, top={top}, right={right}, bottom={bottom}")
                print(f"Transparent borders: left={left}px, top={top}px, right={img.width-right}px, bottom={img.height-bottom}px")
                
                if left > 0 or top > 0 or right < img.width or bottom < img.height:
                    print("✓ Cropping needed - transparent borders detected")
                else:
                    print("✓ No transparent borders - already optimally cropped")
            else:
                print("✗ Image is completely transparent")
                
    except Exception as e:
        print(f"✗ Error testing {input_path}: {e}")

def main():
    parser = argparse.ArgumentParser(description='Crop transparent borders from game sprites')
    parser.add_argument('path', nargs='?', default='assets', 
                       help='Path to sprite file or directory (default: assets)')
    parser.add_argument('--no-backup', action='store_true',
                       help='Don\'t create backup files')
    parser.add_argument('--output-dir', '-o', type=str,
                       help='Output directory for cropped sprites')
    parser.add_argument('--preview', action='store_true',
                       help='Preview what would be cropped without making changes')
    parser.add_argument('--test', action='store_true',
                       help='Test mode - analyze transparent borders in detail')
    parser.add_argument('--alpha-threshold', type=int, default=10,
                       help='Alpha threshold for considering pixels visible (default: 10)')
    
    args = parser.parse_args()
    
    # Check if PIL is available
    try:
        from PIL import Image, ImageChops
    except ImportError:
        print("Error: PIL (Pillow) is required. Install with: pip install Pillow")
        return 1
    
    # Determine what to process
    if os.path.isfile(args.path):
        sprite_files = [args.path]
    elif os.path.isdir(args.path):
        sprite_files = find_sprite_files(args.path)
    else:
        print(f"Error: Path '{args.path}' does not exist")
        return 1
    
    if not sprite_files:
        print(f"No PNG sprite files found in '{args.path}'")
        return 0
    
    print(f"Found {len(sprite_files)} sprite files to process...")
    print("-" * 60)
    
    total_processed = 0
    total_success = 0
    total_pixels_saved = 0
    total_files_changed = 0
    
    for sprite_file in sprite_files:
        if args.test:
            # Test mode - detailed analysis
            test_crop(sprite_file)
        elif args.preview:
            # Preview mode - just analyze without changing
            try:
                with Image.open(sprite_file) as img:
                    bbox = get_bounding_box(img, args.alpha_threshold)
                    if bbox:
                        left, top, right, bottom = bbox
                        original_size = img.size
                        new_size = (right - left, bottom - top)
                        
                        if left == 0 and top == 0 and right == img.width and bottom == img.height:
                            print(f"✓ No crop needed: {sprite_file}")
                        else:
                            saved_pixels = (original_size[0] * original_size[1]) - (new_size[0] * new_size[1])
                            percentage_saved = (saved_pixels / (original_size[0] * original_size[1])) * 100
                            print(f"➤ Would crop: {sprite_file} | {original_size} -> {new_size} | {percentage_saved:.1f}% pixels")
                            print(f"  Borders: L={left}px T={top}px R={img.width-right}px B={img.height-bottom}px")
                            total_files_changed += 1
                            total_pixels_saved += saved_pixels
                    else:
                        print(f"⚠ Completely transparent: {sprite_file}")
            except Exception as e:
                print(f"✗ Error analyzing {sprite_file}: {e}")
        else:
            # Actual processing
            output_path = None
            if args.output_dir:
                # Create output directory structure
                rel_path = os.path.relpath(sprite_file, args.path if os.path.isdir(args.path) else os.path.dirname(args.path))
                output_path = os.path.join(args.output_dir, rel_path)
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            success, message, sizes = crop_sprite(sprite_file, output_path, not args.no_backup, args.alpha_threshold)
            
            if success:
                print(f"✓ {message}")
                total_success += 1
                if sizes[0] and sizes[1] and sizes[0] != sizes[1]:
                    total_files_changed += 1
                    saved_pixels = (sizes[0][0] * sizes[0][1]) - (sizes[1][0] * sizes[1][1])
                    total_pixels_saved += saved_pixels
            else:
                print(f"✗ {message}")
        
        total_processed += 1
    
    print("-" * 60)
    if args.preview:
        print(f"Preview Summary:")
        print(f"  Files analyzed: {total_processed}")
        print(f"  Files that would be cropped: {total_files_changed}")
        print(f"  Total pixels that would be saved: {total_pixels_saved:,}")
        print(f"\nRun without --preview to apply changes")
    else:
        print(f"Processing Summary:")
        print(f"  Files processed: {total_processed}")
        print(f"  Files successfully processed: {total_success}")
        print(f"  Files actually cropped: {total_files_changed}")
        print(f"  Total pixels saved: {total_pixels_saved:,}")
        
        if not args.no_backup and total_files_changed > 0:
            print(f"  Original files backed up with '_original' suffix")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())