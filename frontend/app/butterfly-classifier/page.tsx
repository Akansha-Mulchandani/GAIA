'use client';

import { useState } from 'react';
import { Upload, Button, Card, List, Spin, Typography, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';

const { Title, Text } = Typography;

interface Prediction {
  species: string;
  common_name?: string;
  confidence: number;
  confidence_pct?: number;
  class_id?: number;
  description?: string;
  error?: string;
}

export default function ButterflyClassifier() {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const handleUpload = async () => {
    if (!fileList.length) {
      message.warning('Please select an image first');
      return;
    }

    const file = fileList[0].originFileObj;
    if (!file) {
      message.error('No file selected');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      message.error('Please upload an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      message.error('Image size should be less than 5MB');
      return;
    }

    setLoading(true);
    setPredictions([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Step 1: classify via Gemini only
      const classifyResp = await fetch('/api/gemini/classify', {
        method: 'POST',
        body: formData,
      });
      const classifyData = await classifyResp.json();
      if (!classifyResp.ok) {
        throw new Error(classifyData.detail || classifyData.error || 'Failed to classify image');
      }
      const preds = classifyData.predictions || [];
      setPredictions(preds);
      if (!preds.length) {
        message.warning('No predictions returned');
        return;
      }

      // Step 2: upsert using top species as species_hint
      const top = preds[0]?.species || '';
      const upsertForm = new FormData();
      upsertForm.append('file', file);
      const upsertResp = await fetch(`/api/butterfly/gemini?species_hint=${encodeURIComponent(top)}`, {
        method: 'POST',
        body: upsertForm,
      });
      const upsertData = await upsertResp.json();
      if (!upsertResp.ok) {
        throw new Error(upsertData.detail || upsertData.error || 'Failed to upsert image');
      }

      if (upsertData.upsert?.action === 'incremented') {
        message.success(`Added to existing species: ${upsertData.upsert.species}`);
      } else if (upsertData.upsert?.action === 'created') {
        message.success(`Created new species: ${upsertData.upsert.species}`);
      } else {
        message.success('Classified successfully');
      }

      // Invalidate cached Species Discovery clusters so the page
      // always shows the latest species/images after this upsert.
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const prefix = 'gaia:cache:/species/clusters';
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.sessionStorage.length; i++) {
            const key = window.sessionStorage.key(i);
            if (key && key.startsWith(prefix)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => window.sessionStorage.removeItem(k));
        }
      } catch {
        // Ignore storage errors; worst case the UI will still rely on TTL.
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to classify image';
      message.error(errorMessage);
      
      // Show error in the UI
      setPredictions([
        {
          species: 'Error',
          common_name: 'Classification Failed',
          confidence: 0,
          description: errorMessage
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Species Classifier
        </h1>
        <p className="text-slate-400 mt-2">Upload an image to identify butterfly or moth species</p>
      </div>
      
      <Card 
        className="w-full border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm"
        bodyStyle={{ padding: '2rem' }}
      >
        <div className="text-center">
          <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 transition-colors hover:border-emerald-500/50">
            <Upload
              accept="image/*"
              fileList={fileList}
              onChange={handleChange}
              beforeUpload={() => false}
              maxCount={1}
              showUploadList={false}
            >
              <div className="space-y-4 cursor-pointer">
                <div className="mx-auto w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center">
                  <UploadOutlined className="text-2xl text-emerald-400" />
                </div>
                <div>
                  <div className="font-medium text-slate-200">
                    {fileList.length ? 'Change Image' : 'Upload Image'}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {fileList.length 
                      ? fileList[0].name 
                      : 'Click to browse or drag & drop'}
                  </p>
                </div>
              </div>
            </Upload>
          
            {fileList.length > 0 && (
              <div className="mt-6">
                <Button
                  type="primary"
                  size="large"
                  onClick={handleUpload}
                  loading={loading}
                  className="w-full md:w-auto px-8 bg-gradient-to-r from-emerald-500 to-teal-500 border-none hover:shadow-lg hover:shadow-emerald-500/20"
                >
                  {loading ? 'Analyzing...' : 'Identify Species'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center my-8">
            <Spin size="large" />
            <p className="mt-2">Analyzing image...</p>
          </div>
        )}

        {!loading && predictions.length > 0 && (
          <div className="mt-8">
            <Title level={3} className="mb-6 text-center">Classification Results</Title>
            
            {/* Top Prediction */}
            {predictions[0] && (
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-emerald-500/30 shadow-lg">
                <div className="flex flex-col md:flex-row gap-6">
                  {fileList[0]?.originFileObj && (
                    <div className="relative w-full md:w-1/3 h-64 rounded-lg overflow-hidden">
                      <img 
                        src={URL.createObjectURL(fileList[0].originFileObj)} 
                        alt="Uploaded butterfly"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <div className="text-white font-medium">
                          {predictions[0].common_name || predictions[0].species}
                        </div>
                        <div className="text-emerald-300 text-sm">
                          {predictions[0].species}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">
                          {predictions[0].common_name || predictions[0].species}
                        </h3>
                        <div className="text-sm text-slate-400">
                          {predictions[0].species}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-400">
                          {predictions[0].confidence_pct?.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-400">Confidence</div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-slate-700/50 rounded-full h-2.5 mb-4">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2.5 rounded-full" 
                        style={{ width: `${Math.min(100, Math.max(0, predictions[0].confidence_pct || 0))}%` }}
                      ></div>
                    </div>
                    
                    {predictions[0].description && (
                      <div className="prose prose-invert max-w-none">
                        <p className="text-slate-300">{predictions[0].description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Additional Predictions */}
            {predictions.length > 1 && (
              <div className="mt-8">
                <h4 className="text-lg font-semibold mb-4">Other Possible Matches</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {predictions.slice(1).map((prediction, index) => (
                    <div key={index} className="glass p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{prediction.common_name || prediction.species}</div>
                          <div className="text-sm text-slate-400">{prediction.species}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-emerald-400">
                            {prediction.confidence_pct?.toFixed(1)}%
                          </div>
                          <div className="text-xs text-slate-400">Confidence</div>
                        </div>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-1.5 mb-2">
                        <div 
                          className="bg-emerald-500/50 h-1.5 rounded-full" 
                          style={{ width: `${Math.min(100, Math.max(0, prediction.confidence_pct || 0))}%` }}
                        ></div>
                      </div>
                      {prediction.description && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                          {prediction.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Try Another Button */}
            <div className="mt-8 text-center">
              <Button 
                type="default" 
                size="large"
                onClick={() => {
                  setFileList([]);
                  setPredictions([]);
                }}
                className="px-8"
              >
                Try Another Image
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
