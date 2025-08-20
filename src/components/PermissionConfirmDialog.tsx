import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle } from "lucide-react";
import { CRITICAL_PERMISSIONS } from '@/lib/permissions/rules';

interface PermissionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  permission: {
    permission_name: string;
    permission_key: string;
    role: string;
    description?: string;
  } | null;
  isEnabling: boolean;
}

export function PermissionConfirmDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  permission, 
  isEnabling 
}: PermissionConfirmDialogProps) {
  if (!permission) return null;

  const isCritical = CRITICAL_PERMISSIONS.includes(permission.permission_key as any);
  const action = isEnabling ? 'habilitar' : 'desabilitar';
  const actionColor = isEnabling ? 'text-green-600' : 'text-red-600';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            {isCritical ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <Shield className="h-5 w-5 text-blue-500" />
            )}
            <AlertDialogTitle>
              Confirmar Alteração de Permissão
            </AlertDialogTitle>
          </div>
          
          <AlertDialogDescription className="space-y-3">
            <div>
              Você está prestes a <span className={`font-semibold ${actionColor}`}>
                {action}
              </span> a permissão:
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <div className="font-medium">{permission.permission_name}</div>
              {permission.description && (
                <div className="text-sm text-gray-600">{permission.description}</div>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline">Role: {permission.role}</Badge>
                {isCritical && (
                  <Badge variant="destructive" className="text-xs">
                    Crítica
                  </Badge>
                )}
              </div>
            </div>

            {isCritical && !isEnabling && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Atenção!</span>
                </div>
                <div className="text-sm text-amber-700 mt-1">
                  Esta é uma permissão crítica. Desabilitá-la pode impedir o acesso a funcionalidades essenciais.
                </div>
              </div>
            )}

            <div className="text-sm text-gray-500">
              Esta ação afetará todos os usuários com o role <strong>{permission.role}</strong>.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={isEnabling ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {isEnabling ? 'Habilitar' : 'Desabilitar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}