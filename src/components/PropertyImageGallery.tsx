import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { PropertyWithImages } from "@/hooks/useProperties";

interface PropertyImageGalleryProps {
  property: PropertyWithImages | null;
  open: boolean;
  onClose: () => void;
  initialImageIndex?: number;
}

export function PropertyImageGallery({ 
  property, 
  open, 
  onClose, 
  initialImageIndex = 0 
}: PropertyImageGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(initialImageIndex);

  console.log('🖼️ PropertyImageGallery - Props:', { 
    property: property?.title, 
    open, 
    initialImageIndex,
    imagesCount: property?.property_images?.length || 0
  });

  // Reset image index when property changes or dialog opens
  useEffect(() => {
    if (open && property) {
      setCurrentImageIndex(initialImageIndex);
    }
  }, [property?.id, open, initialImageIndex]);

  // Early return if no property or images
  if (!property || !property.property_images || property.property_images.length === 0) {
    return null;
  }

  const images = property.property_images;
  const safeImageIndex = Math.min(Math.max(currentImageIndex, 0), images.length - 1);
  const currentImage = images[safeImageIndex];

  const handlePrevious = () => {
    setCurrentImageIndex(prev => {
      const newIndex = prev > 0 ? prev - 1 : images.length - 1;
      return Math.min(Math.max(newIndex, 0), images.length - 1);
    });
  };

  const handleNext = () => {
    setCurrentImageIndex(prev => {
      const newIndex = prev < images.length - 1 ? prev + 1 : 0;
      return Math.min(Math.max(newIndex, 0), images.length - 1);
    });
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] bg-gray-900 border-gray-700 text-white overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">{property.title}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-300">
            Imagem {safeImageIndex + 1} de {images.length}
          </p>
        </DialogHeader>

        <div className="space-y-4 px-2 md:px-0">
          {/* Imagem principal */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '60vh' }}>
            {currentImage && (
              <img
                src={currentImage.image_url}
                alt={`${property.title} - Imagem ${safeImageIndex + 1}`}
                className="w-full h-full object-contain object-center mx-auto"
                onError={() => {
                  // Error loading image
                }}
              />
            )}

            {/* Botões de navegação */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="w-full overflow-x-auto">
              <div className="flex gap-2 w-max px-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => handleThumbnailClick(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                      index === safeImageIndex
                        ? 'border-blue-500'
                        : 'border-transparent hover:border-gray-400'
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 