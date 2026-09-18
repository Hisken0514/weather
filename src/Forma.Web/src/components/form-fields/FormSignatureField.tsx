/**
 * FormSignatureField - 簽名欄位組件
 */

import { useRef, useEffect, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Paper,
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import type { SignatureField as SignatureFieldType } from '@/types/form';

interface FormSignatureFieldProps {
  field: SignatureFieldType;
}

export function FormSignatureField({ field }: FormSignatureFieldProps) {
  const { control } = useFormContext();
  const { id, name, label, description, required, disabled, readOnly, properties } = field;

  const width = properties?.width ?? 400;
  const height = properties?.height ?? 200;
  const penColor = properties?.penColor ?? '#000000';
  const backgroundColor = properties?.backgroundColor ?? '#ffffff';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      defaultValue=""
      rules={{ required: required ? '此欄位為必填' : false }}
      render={({ field: controllerField, fieldState: { error } }) => {
        const initCanvas = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);
          ctx.strokeStyle = penColor;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // 如果有已存的簽名資料，載入它
          if (controllerField.value) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
            };
            img.src = controllerField.value;
          }
        };

        useEffect(() => {
          initCanvas();
        }, []);

        const getPos = (e: React.MouseEvent | React.TouchEvent) => {
          const canvas = canvasRef.current;
          if (!canvas) return { x: 0, y: 0 };

          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;

          if ('touches' in e) {
            return {
              x: (e.touches[0].clientX - rect.left) * scaleX,
              y: (e.touches[0].clientY - rect.top) * scaleY,
            };
          }
          return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
          };
        };

        const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
          if (disabled || readOnly) return;
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (!ctx) return;

          const pos = getPos(e);
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          setIsDrawing(true);
        };

        const draw = (e: React.MouseEvent | React.TouchEvent) => {
          if (!isDrawing || disabled || readOnly) return;
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (!ctx) return;

          const pos = getPos(e);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        };

        const stopDrawing = () => {
          if (!isDrawing) return;
          setIsDrawing(false);

          // 儲存簽名為 base64
          const canvas = canvasRef.current;
          if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            controllerField.onChange(dataUrl);
          }
        };

        const clearSignature = () => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (!ctx) return;

          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);
          controllerField.onChange('');
        };

        return (
          <FormControl error={!!error} disabled={disabled} fullWidth>
            <FormLabel required={required}>{label ?? name}</FormLabel>

            <Box
              sx={{
                mt: 1,
                p: 2,
                backgroundColor: '#e0e0e0',
                borderRadius: 1,
                display: 'inline-block',
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 0,
                  display: 'block',
                  backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper',
                  width: width,
                  height: height,
                  overflow: 'hidden',
                }}
              >
                <canvas
                  ref={canvasRef}
                  id={id}
                  width={width}
                  height={height}
                  style={{
                    display: 'block',
                    cursor: disabled || readOnly ? 'default' : 'crosshair',
                    touchAction: 'none',
                    width: width,
                    height: height,
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </Paper>
            </Box>

            {!readOnly && (
              <Box sx={{ mt: 1 }}>
                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  onClick={clearSignature}
                  disabled={disabled}
                >
                  清除簽名
                </Button>
              </Box>
            )}

            <FormHelperText>{error?.message ?? description}</FormHelperText>
          </FormControl>
        );
      }}
    />
  );
}

export default FormSignatureField;
