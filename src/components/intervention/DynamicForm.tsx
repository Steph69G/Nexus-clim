import { useState, useRef } from "react";
import { Camera, Save, CheckCircle } from "lucide-react";

interface Field {
  name: string;
  label: string;
  type: string;
  options?: string[];
  label_text?: string;
}

interface Step {
  step_number: number;
  title: string;
  description: string;
  is_mandatory: boolean;
  requires_photo: boolean;
  requires_signature: boolean;
  requires_measurement: boolean;
  fields: Field[];
}

interface DynamicFormProps {
  steps: Step[];
  onSave: (data: Record<string, any>) => void;
  onComplete: () => void;
  initialData?: Record<string, any>;
  readOnly?: boolean;
}

export default function DynamicForm({
  steps,
  onSave,
  onComplete,
  initialData = {},
  readOnly = false,
}: DynamicFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [stepPhotos, setStepPhotos] = useState<Record<number, string[]>>({});
  const [stepSignatures, setStepSignatures] = useState<Record<number, Record<string, string>>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const currentStep = steps[currentStepIndex];

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const readers = fileArray.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then((base64Images) => {
        setStepPhotos((prev) => ({
          ...prev,
          [currentStep.step_number]: [
            ...(prev[currentStep.step_number] || []),
            ...base64Images,
          ],
        }));
      });
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveSignature = (fieldName: string) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const signatureData = canvas.toDataURL();
      setStepSignatures((prev) => ({
        ...prev,
        [currentStep.step_number]: {
          ...prev[currentStep.step_number],
          [fieldName]: signatureData,
        },
      }));

      handleFieldChange(fieldName, signatureData);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const renderField = (field: Field) => {
    const value = formData[field.name] || "";

    switch (field.type) {
      case "text":
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        );

      case "number":
        return (
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        );

      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            disabled={readOnly}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        );

      case "checkbox":
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              disabled={readOnly}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
            />
            {field.label_text && (
              <span className="ml-2 text-gray-700">{field.label_text}</span>
            )}
          </div>
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Sélectionner --</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        );

      case "signature":
        return (
          <div className="space-y-2">
            {stepSignatures[currentStep.step_number]?.[field.name] ? (
              <div className="border border-gray-300 rounded-lg p-2">
                <img
                  src={stepSignatures[currentStep.step_number][field.name]}
                  alt={field.label}
                  className="max-w-full h-auto"
                />
              </div>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveSignature(field.name)}
                    disabled={readOnly}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Enregistrer signature
                  </button>
                  <button
                    type="button"
                    onClick={clearSignature}
                    disabled={readOnly}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    Effacer
                  </button>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceedToNextStep = () => {
    if (!currentStep.is_mandatory) return true;

    for (const field of currentStep.fields) {
      const value = formData[field.name];
      if (!value && value !== false && value !== 0) {
        return false;
      }
    }

    return true;
  };

  const goToNextStep = () => {
    if (canProceedToNextStep()) {
      onSave(formData);
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    } else {
      alert("Veuillez remplir tous les champs obligatoires avant de continuer.");
    }
  };

  const goToPreviousStep = () => {
    onSave(formData);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const completeForm = () => {
    if (canProceedToNextStep()) {
      onSave(formData);
      onComplete();
    } else {
      alert("Veuillez remplir tous les champs obligatoires avant de terminer.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Étape {currentStepIndex + 1} sur {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(((currentStepIndex + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Step header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
            {currentStep.step_number}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentStep.title}
            </h2>
            <p className="text-gray-600">{currentStep.description}</p>
          </div>
        </div>
        {currentStep.is_mandatory && (
          <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded">
            Obligatoire
          </span>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-6 mb-6">
        {currentStep.fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
            </label>
            {renderField(field)}
          </div>
        ))}

        {/* Photo capture */}
        {currentStep.requires_photo && !readOnly && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="inline w-4 h-4 mr-1" />
              Photos
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoCapture}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {stepPhotos[currentStep.step_number]?.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {stepPhotos[currentStep.step_number].map((photo, idx) => (
                  <img
                    key={idx}
                    src={photo}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-24 object-cover rounded"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <button
          type="button"
          onClick={goToPreviousStep}
          disabled={currentStepIndex === 0 || readOnly}
          className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Précédent
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onSave(formData)}
            disabled={readOnly}
            className="px-6 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Sauvegarder
          </button>

          {currentStepIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={goToNextStep}
              disabled={readOnly}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Suivant
            </button>
          ) : (
            <button
              type="button"
              onClick={completeForm}
              disabled={readOnly}
              className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
