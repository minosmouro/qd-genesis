import React, { useCallback, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface DragDropImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  onUpload: (files: File[]) => Promise<void>;
  maxImages?: number;
  isUploading?: boolean;
}

const DragDropImageUpload: React.FC<DragDropImageUploadProps> = ({
  images,
  onImagesChange,
  onUpload,
  maxImages = 30,
  isUploading = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length === 0) {
      toast.error('Nenhuma imagem válida encontrada');
      return;
    }

    if (images.length + files.length > maxImages) {
      toast.error(`Máximo de ${maxImages} imagens permitidas`);
      return;
    }

    await onUpload(files);
  }, [images.length, maxImages, onUpload]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast.error(`Máximo de ${maxImages} imagens permitidas`);
      return;
    }

    await onUpload(files);
    e.target.value = '';
  }, [images.length, maxImages, onUpload]);

  const handleRemoveImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    toast.success('Imagem removida');
  }, [images, onImagesChange]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleDragOverImage = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    
    onImagesChange(newImages);
    setDraggedIndex(index);
  }, [draggedIndex, images, onImagesChange]);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/10 scale-105'
            : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-hover',
          isUploading && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center text-center">
          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-sm font-medium text-text-primary">
                Enviando imagens...
              </p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-text-secondary mb-4" />
              <p className="text-sm font-medium text-text-primary mb-1">
                Arraste e solte imagens aqui
              </p>
              <p className="text-xs text-text-secondary">
                ou clique para selecionar arquivos
              </p>
              <p className="text-xs text-text-tertiary mt-2">
                Máximo de {maxImages} imagens • PNG, JPG até 10MB cada
              </p>
            </>
          )}
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOverImage(e, index)}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-move group',
                draggedIndex === index
                  ? 'border-primary opacity-50 scale-95'
                  : 'border-border hover:border-primary/50 hover:scale-105'
              )}
            >
              <img
                src={image}
                alt={`Imagem ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="p-2 bg-danger rounded-full hover:bg-danger/90 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Badge de capa */}
              {index === 0 && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-xs font-bold rounded">
                  CAPA
                </div>
              )}

              {/* Número da imagem */}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      {images.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            {images.length} de {maxImages} imagens
          </span>
          <span className="text-text-tertiary">
            Arraste para reordenar
          </span>
        </div>
      )}
    </div>
  );
};

export default DragDropImageUpload;