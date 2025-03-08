'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { encode, decode } from '@msgpack/msgpack';
import { hexDump } from '@/lib/utils';
import { ClientMessage, ServerMessage } from '@/lib/messages';
import { useGameStore } from '@/lib/store';

export function MessagePackDebug() {
  const [input, setInput] = useState<string>('{"type":"join","data":{"name":"Player","skin":{"id":"default","primaryColor":"#ff0000","secondaryColor":"#0000ff"},"timestamp":1633881600000}}');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const socket = useGameStore(state => state.socket);

  const testEncode = useCallback(() => {
    try {
      setError('');
      const jsonData = JSON.parse(input);
      const encoded = encode(jsonData, {
        ignoreUndefined: true,
        forceFloat32: true,
        sortKeys: true,
        ignoreNil: true
      });
      
      setOutput(`Encoded (${encoded.byteLength} bytes):\n\n${hexDump(new Uint8Array(encoded))}`);
    } catch (err) {
      setError(`Encoding error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [input]);
  
  const testDecode = useCallback(() => {
    try {
      setError('');
      // Convert hex string to byte array
      const hexInput = input.replace(/[^0-9a-f]/gi, '');
      if (hexInput.length % 2 !== 0) {
        throw new Error('Hex string must have an even number of characters');
      }
      
      const bytes = new Uint8Array(hexInput.length / 2);
      for (let i = 0; i < hexInput.length; i += 2) {
        bytes[i/2] = parseInt(hexInput.substring(i, i + 2), 16);
      }
      
      const decoded = decode(bytes);
      setOutput(`Decoded (${bytes.length} bytes):\n\n${JSON.stringify(decoded, null, 2)}`);
    } catch (err) {
      setError(`Decoding error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [input]);
  
  const testSocketEncoding = useCallback(() => {
    if (!socket) {
      setError('WebSocket not initialized');
      return;
    }
    
    try {
      setError('');
      const jsonData = JSON.parse(input) as ClientMessage;
      const encoded = socket.testMessageEncoding(jsonData);
      
      setOutput(`Socket-encoded (${encoded.byteLength} bytes):\n\n${hexDump(new Uint8Array(encoded))}`);
    } catch (err) {
      setError(`Socket encoding error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [input, socket]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>MessagePack Debug Tool</CardTitle>
        <CardDescription>Test MessagePack encoding/decoding to diagnose client-server issues</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="input" className="block text-sm font-medium mb-1">
              Input (JSON or hex string):
            </label>
            <Textarea
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={testEncode} variant="outline">Test Encode JSON</Button>
            <Button onClick={testDecode} variant="outline">Decode Hex</Button>
            <Button onClick={testSocketEncoding} variant="outline" disabled={!socket}>
              Test Socket Encoding
            </Button>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="output" className="block text-sm font-medium mb-1">
              Output:
            </label>
            <Textarea
              id="output"
              value={output}
              readOnly
              rows={12}
              className="font-mono text-sm"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-gray-500">
        Tip: Use this tool to compare client and server MessagePack formats
      </CardFooter>
    </Card>
  );
} 