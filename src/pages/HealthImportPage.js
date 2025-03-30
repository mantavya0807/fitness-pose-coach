// src/pages/HealthImportPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import Papa from 'papaparse';

const HealthImportPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [selectedFileType, setSelectedFileType] = useState('apple_health');
  const [file, setFile] = useState(null);
  const [importStatus, setImportStatus] = useState({ loading: false, error: null, success: false });
  const [previewData, setPreviewData] = useState(null);
  
  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setImportStatus({ loading: false, error: null, success: false });
    
    // Preview CSV files
    if (selectedFile.type === 'text/csv') {
      Papa.parse(selectedFile, {
        preview: 5, // First 5 rows
        header: true,
        complete: (results) => {
          setPreviewData({
            headers: results.meta.fields,
            rows: results.data.slice(0, 5)
          });
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setImportStatus({ loading: false, error: 'Failed to parse CSV file', success: false });
        }
      });
    } else {
      setPreviewData(null);
    }
  };
  
  // Handle file type selection
  const handleFileTypeChange = (e) => {
    setSelectedFileType(e.target.value);
    setPreviewData(null);
    setFile(null);
  };
  
  // Process import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      setImportStatus({ loading: true, error: null, success: false });
      
      // In a real implementation, you would:
      // 1. Read and parse the file
      // 2. Process the data
      // 3. Make API calls to save the data
      
      // For demonstration, we'll simulate a successful import
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 2000);
      });
    },
    onSuccess: () => {
      setImportStatus({ loading: false, error: null, success: true });
      setTimeout(() => navigate('/connect/health'), 1500);
    },
    onError: (error) => {
      setImportStatus({ loading: false, error: error.message, success: false });
    }
  });
  
  // Handle import submission
  const handleImport = (e) => {
    e.preventDefault();
    if (!file) {
      setImportStatus({ loading: false, error: 'Please select a file to import', success: false });
      return;
    }
    
    importMutation.mutate();
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Import Health Data</h1>
      <p className="text-gray-600 mb-6">
        Upload data exported from your health app to sync it with your account.
      </p>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleImport}>
          {/* File Type Selection */}
          <div className="mb-4">
            <label htmlFor="file-type" className="block text-sm font-medium text-gray-700 mb-1">
              Health Data Source
            </label>
            <select
              id="file-type"
              value={selectedFileType}
              onChange={handleFileTypeChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="apple_health">Apple Health Export</option>
              <option value="samsung_health">Samsung Health Export</option>
              <option value="fitbit">Fitbit Export</option>
              <option value="garmin">Garmin Connect Export</option>
              <option value="google_fit">Google Fit Export</option>
              <option value="custom_csv">Custom CSV Format</option>
            </select>
          </div>
          
          {/* File Upload */}
          <div className="mb-6">
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
              Upload File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept={selectedFileType === 'custom_csv' ? '.csv' : '.xml,.zip,.csv'}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  {selectedFileType === 'apple_health' && 'ZIP or XML file exported from Apple Health'}
                  {selectedFileType === 'samsung_health' && 'ZIP file exported from Samsung Health'}
                  {selectedFileType === 'fitbit' && 'CSV files exported from Fitbit'}
                  {selectedFileType === 'garmin' && 'ZIP or CSV files exported from Garmin Connect'}
                  {selectedFileType === 'google_fit' && 'CSV files exported from Google Fit'}
                  {selectedFileType === 'custom_csv' && 'CSV with columns: date, steps, heart_rate, etc.'}
                </p>
              </div>
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-500">
                Selected file: <span className="font-medium">{file.name}</span> ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>
          
          {/* Data Preview (for CSV files) */}
          {previewData && (
            <div className="mb-6 overflow-x-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Data Preview</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData.headers.map((header, index) => (
                      <th
                        key={index}
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {previewData.headers.map((header, colIndex) => (
                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Import Options (simplified) */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Import Options</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="overwrite"
                  name="import-mode"
                  type="radio"
                  defaultChecked={true}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="overwrite" className="ml-2 block text-sm text-gray-700">
                  Merge with existing data (recommended)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="append"
                  name="import-mode"
                  type="radio"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="append" className="ml-2 block text-sm text-gray-700">
                  Replace all existing data
                </label>
              </div>
            </div>
          </div>
          
          {/* Status Messages */}
          {importStatus.error && (
            <div className="mb-4 bg-red-50 p-4 rounded-md">
              <p className="text-red-700">{importStatus.error}</p>
            </div>
          )}
          
          {importStatus.success && (
            <div className="mb-4 bg-green-50 p-4 rounded-md">
              <p className="text-green-700">Import successful! Redirecting...</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/connect/health')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || importStatus.loading || importStatus.success}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {importStatus.loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Importing...
                </span>
              ) : 'Import Data'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Import Instructions */}
      <div className="mt-6 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">How to Export Your Health Data</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-700">Apple Health</h3>
            <ol className="mt-2 ml-6 space-y-1 text-sm text-gray-600 list-decimal">
              <li>Open the Health app on your iPhone</li>
              <li>Tap on your profile picture in the top right corner</li>
              <li>Scroll down and tap on "Export All Health Data"</li>
              <li>Wait for the export to complete (this may take a few minutes)</li>
              <li>Choose how to share the generated ZIP file (email, cloud storage, etc.)</li>
              <li>Upload the ZIP file here</li>
            </ol>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700">Samsung Health</h3>
            <ol className="mt-2 ml-6 space-y-1 text-sm text-gray-600 list-decimal">
              <li>Open the Samsung Health app</li>
              <li>Tap on the menu icon and go to "Settings"</li>
              <li>Scroll down to "Download personal data"</li>
              <li>Select the data you want to export</li>
              <li>Tap "Start" and wait for the export to complete</li>
              <li>Download and upload the ZIP file here</li>
            </ol>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700">Fitbit</h3>
            <ol className="mt-2 ml-6 space-y-1 text-sm text-gray-600 list-decimal">
              <li>Log in to your Fitbit account on fitbit.com</li>
              <li>Click on the gear icon and select "Settings"</li>
              <li>Go to "Data Export" under "Export & Backups"</li>
              <li>Choose the data range and click "Download"</li>
              <li>Upload the CSV files here</li>
            </ol>
          </div>
          
          <p className="text-sm text-gray-500 italic">
            Note: The imported data will be synchronized with your account and used to enhance your fitness tracking.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HealthImportPage;