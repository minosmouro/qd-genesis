import React, { useEffect, useState } from 'react';

interface ScheduleReportProps {
  scheduleId: number;
  scheduleName?: string;
}

interface RefreshJob {
  job_id: number;
  property_id: number;
  property_name?: string;
  schedule_id: number;
  schedule_name?: string;
  status: string;
  refresh_type: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  error_type?: string;
  error_message?: string;
}

const ScheduleReport: React.FC<ScheduleReportProps> = ({ scheduleId, scheduleName }) => {
  const [jobs, setJobs] = useState<RefreshJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/refresh-jobs?schedule_id=${scheduleId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao buscar jobs do agendamento');
        return res.json();
      })
      .then((data) => {
        setJobs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [scheduleId]);

  const total = jobs.length;
  const completed = jobs.filter(j => j.status === 'completed').length;
  const failed = jobs.filter(j => j.status === 'failed').length;
  const pending = jobs.filter(j => j.status === 'pending').length;
  const running = jobs.filter(j => j.status === 'running').length;

  if (loading) return <div>Carregando relatório...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div style={{ marginTop: 32 }}>
      <h3>Relatório do Agendamento: {scheduleName || scheduleId}</h3>
      <div style={{ marginBottom: 16 }}>
        <strong>Total de Jobs:</strong> {total} &nbsp;|
        <span style={{ color: '#4dff88' }}> Sucesso: {completed} </span>|
        <span style={{ color: '#ff4d4d' }}> Falha: {failed} </span>|
        <span style={{ color: '#ffe066' }}> Pendente: {pending} </span>|
        <span style={{ color: '#66b3ff' }}> Executando: {running} </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Propriedade</th>
            <th>Status</th>
            <th>Tipo</th>
            <th>Início</th>
            <th>Fim</th>
            <th>Tipo de Erro</th>
            <th>Mensagem de Erro</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.job_id} style={{ background: job.status === 'failed' ? '#ffe5e5' : job.status === 'completed' ? '#e5ffe5' : job.status === 'pending' ? '#fffbe5' : job.status === 'running' ? '#e5f0ff' : 'white' }}>
              <td>{job.job_id}</td>
              <td>{job.property_name || job.property_id}</td>
              <td>{job.status}</td>
              <td>{job.refresh_type}</td>
              <td>{job.started_at ? new Date(job.started_at).toLocaleString() : '-'}</td>
              <td>{job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}</td>
              <td>{job.error_type || '-'}</td>
              <td>
                {job.error_message ? (
                  <span title={job.error_message} style={{ cursor: 'pointer', color: '#d9534f' }}>
                    {job.error_message.length > 40 ? job.error_message.slice(0, 40) + '...' : job.error_message}
                  </span>
                ) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ScheduleReport;
