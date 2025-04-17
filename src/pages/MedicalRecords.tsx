import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const MedicalRecords = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [openNewRecord, setOpenNewRecord] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [openViewRecord, setOpenViewRecord] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null as File | null,
  });

  useEffect(() => {
    if (user) {
      fetchMedicalRecords();
    }
  }, [user]);

  const fetchMedicalRecords = async () => {
    setLoading(true);
    try {
      let query = supabase.from('medical_records').select('*');
      
      if (userRole === 'patient') {
        query = query.eq('patient_id', user!.id);
      } else if (userRole === 'doctor') {
        // For doctors, fetch records of their patients
        const { data: appointments } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('doctor_id', user!.id)
          .eq('status', 'completed');
        
        if (appointments && appointments.length > 0) {
          const patientIds = [...new Set(appointments.map(a => a.patient_id))];
          query = query.in('patient_id', patientIds);
        } else {
          setRecords([]);
          setLoading(false);
          return;
        }
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // If we have data, fetch the related patient information
      if (data && data.length > 0) {
        const patientIds = [...new Set(data.map(record => record.patient_id))];
        const { data: patients, error: patientsError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', patientIds);
        
        if (patientsError) throw patientsError;
        
        // Combine the records with patient information
        const recordsWithPatients = data.map(record => {
          const patient = patients?.find(p => p.id === record.patient_id);
          return { ...record, patient };
        });
        
        setRecords(recordsWithPatients);
      } else {
        setRecords([]);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching medical records",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({
        ...formData,
        file: e.target.files[0]
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast({
        title: "Missing information",
        description: "Please provide a title for the medical record",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // First, create the record entry
      const recordData = {
        patient_id: user!.id,
        title: formData.title,
        description: formData.description,
        created_at: new Date().toISOString(),
      };
      
      const { data: record, error } = await supabase
        .from('medical_records')
        .insert(recordData)
        .select()
        .single();
      
      if (error) throw error;
      
      // If there's a file, upload it
      if (formData.file && record) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${user!.id}/${record.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('medical_records')
          .upload(fileName, formData.file);
        
        if (uploadError) throw uploadError;
        
        // Update the record with the file path
        const { error: updateError } = await supabase
          .from('medical_records')
          .update({ file_path: fileName })
          .eq('id', record.id);
        
        if (updateError) throw updateError;
      }
      
      toast({
        title: "Record created",
        description: "Your medical record has been saved successfully.",
      });
      
      setOpenNewRecord(false);
      setFormData({
        title: '',
        description: '',
        file: null,
      });
      fetchMedicalRecords();
    } catch (error: any) {
      toast({
        title: "Error creating record",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewRecord = (record: any) => {
    setSelectedRecord(record);
    setOpenViewRecord(true);
  };

  const renderRecordsList = () => {
    if (loading) {
      return Array(3).fill(0).map((_, index) => (
        <Card key={index} className="mb-4">
          <CardHeader>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-9 w-full" />
          </CardFooter>
        </Card>
      ));
    }

    if (records.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No medical records</CardTitle>
            <CardDescription>
              {userRole === 'patient' 
                ? "You don't have any medical records yet. Create one to get started."
                : "No medical records found for your patients."}
            </CardDescription>
          </CardHeader>
          {userRole === 'patient' && (
            <CardFooter>
              <Button onClick={() => setOpenNewRecord(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Medical Record
              </Button>
            </CardFooter>
          )}
        </Card>
      );
    }

    return records.map(record => {
      const createdAt = parseISO(record.created_at);
      const patientName = record.patient 
        ? `${record.patient.first_name} ${record.patient.last_name}`
        : 'Unknown Patient';
      
      return (
        <Card key={record.id} className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{record.title}</CardTitle>
                <CardDescription>
                  {format(createdAt, 'MMMM d, yyyy')}
                </CardDescription>
              </div>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {userRole !== 'patient' && (
              <p className="text-sm font-medium mb-2">Patient: {patientName}</p>
            )}
            {record.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{record.description}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => handleViewRecord(record)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
            {record.file_path && (
              <Button variant="secondary">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </CardFooter>
        </Card>
      );
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Medical Records</h1>
        {userRole === 'patient' && (
          <Button onClick={() => setOpenNewRecord(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Medical Record
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {renderRecordsList()}
      </div>

      {/* New Record Dialog */}
      <Dialog open={openNewRecord} onOpenChange={setOpenNewRecord}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Medical Record</DialogTitle>
            <DialogDescription>
              Upload medical documents, test results, or other health information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Blood Test Results"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Add details about this record"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="file">Upload File (optional)</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, JPG, PNG, DOC, DOCX
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenNewRecord(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Record Dialog */}
      {selectedRecord && (
        <Dialog open={openViewRecord} onOpenChange={setOpenViewRecord}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{selectedRecord.title}</DialogTitle>
              <DialogDescription>
                Created on {format(parseISO(selectedRecord.created_at), 'MMMM d, yyyy')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {userRole !== 'patient' && selectedRecord.patient && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium">Patient</h4>
                  <p>{`${selectedRecord.patient.first_name} ${selectedRecord.patient.last_name}`}</p>
                </div>
              )}
              {selectedRecord.description && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium">Description</h4>
                  <p className="text-sm">{selectedRecord.description}</p>
                </div>
              )}
              {selectedRecord.file_path && (
                <div className="mt-4">
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MedicalRecords;