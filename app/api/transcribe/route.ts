import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';

const s3 = new S3Client({ region: process.env.AWS_REGION });
const transcribe = new TranscribeClient({ region: process.env.AWS_REGION });

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File;
    if (!file) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    console.log('📥 Received audio:', file.name, file.size, file.type);

    // 1. Upload to S3
    const key = `transcribe-input/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );
    console.log('✅ Uploaded to S3:', key);

    // 2. Start transcription job
    const jobName = `job-${Date.now()}`;
    const outputKey = `transcribe-output/${jobName}.json`;

    await transcribe.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: 'en-US',
        Media: {
          MediaFileUri: `s3://${BUCKET_NAME}/${key}`,
        },
        OutputBucketName: BUCKET_NAME,
        OutputKey: outputKey,
        Settings: {
          ShowSpeakerLabels: false, // ✅ No speaker labels, so no MaxSpeakerLabels
        },
      })
    );
    console.log('✅ Started transcription job:', jobName);

    // 3. Poll for completion
    let jobStatus = 'IN_PROGRESS';
    let transcript = '';
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds

    while (jobStatus !== 'COMPLETED' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
      const job = await transcribe.send(
        new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
      );
      jobStatus = job.TranscriptionJob?.TranscriptionJobStatus || 'FAILED';
      console.log(`⏳ Job status: ${jobStatus} (${attempts}s)`);

      if (jobStatus === 'COMPLETED') {
        const transcriptUri = job.TranscriptionJob?.Transcript?.TranscriptFileUri;
        if (transcriptUri) {
          const response = await fetch(transcriptUri);
          const data = await response.json();
          transcript = data.results.transcripts[0]?.transcript || '';
          break;
        }
      }
    }

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcription timed out or failed' },
        { status: 500 }
      );
    }

    console.log('📝 Transcript:', transcript);
    return NextResponse.json({ text: transcript });
  } catch (error: any) {
    console.error('❌ Transcription error:', error);
    return NextResponse.json(
      { error: error.message || 'Transcription failed' },
      { status: 500 }
    );
  }
}