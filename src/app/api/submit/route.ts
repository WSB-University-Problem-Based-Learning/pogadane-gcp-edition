import { speech } from "@/lib/speech";
import { translate } from "@/lib/translate";
import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";
import { storage } from "@/lib/storage";
import { randomUUID } from "crypto";

const bucketName = 'pogadane-bucket'

const translateText = async (text: string[]): Promise<string[]> => {
  if (!text) {
    return []
  }

  const request = {
    parent: `projects/pogadane/locations/global`,
    contents: text,
    targetLanguageCode: 'pl',
    sourceLanguageCode: 'en',
  }

  const [response] = await translate.translateText(request)

  return response.translations?.map(t => t.translatedText as string) ?? [];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const tempFileName = `temp-audio-${randomUUID()}`
  const gcsUri = `gs://${bucketName}/${tempFileName}`

  try {
    const contentType = request.headers.get('content-type') || '';
    let audioBytes: Buffer;
    let fileType: string | undefined;

    if (contentType.includes('application/json')) {
      console.log('Processing YouTube video')

      const body = await request.json()
      const url = body.url as string

      if (!ytdl.validateURL(url)) {
        throw new Error("Invalid YouTube URL")
      }
        
      const audioStream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' })

      const chunks: Buffer[] = []

      for await (const chunk of audioStream) {
        chunks.push(chunk as Buffer)
      }

      audioBytes = Buffer.concat(chunks)
      fileType = 'audio/webm'
    } else {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        throw new Error('No file provided.')
      }
        
      audioBytes = Buffer.from(await file.arrayBuffer())
      fileType = file.type
    }

    await storage.bucket(bucketName).file(tempFileName).save(audioBytes, {
        contentType: fileType
    });

    const audio = { uri: gcsUri };
    
    const config = {
      languageCode: 'en-US',
      enableSeparateRecognitionPerChannel: true,
      audioChannelCount: 2,
      enableAutomaticPunctuation: true,
    };

    const speechRequest = { audio, config };

    const [operation] = await speech.longRunningRecognize(speechRequest);
    const [response] = await operation.promise()

    const transcriptionArr = response.results?.map(result => result.alternatives?.[0].transcript?.trimStart() as string) || []

    const translationArr = await translateText(transcriptionArr)

    const transcription = transcriptionArr.join('\n\n')
    const translation = translationArr.join('\n\n')

    return NextResponse.json({ transcription, translation })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Direct processing error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    try {
      await storage.bucket(bucketName).file(tempFileName).delete();
    } catch (cleanupError) {
      console.error(`Failed to delete temporary file ${gcsUri}:`, cleanupError);
    }
  }
}
