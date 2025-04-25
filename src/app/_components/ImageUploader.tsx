"use client";

import {
  useState,
  type DragEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import { api } from "~/trpc/react";

interface ChessMove {
  from: string;
  to: string;
  comments: string;
}
interface ChessResponse {
  whiteBestMove: ChessMove | null;
  blackBestMove: ChessMove | null;
}

export function ImageUploader() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [chessResponse, setChessResponse] = useState<ChessResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const getMovesMutation = api.post.getChessBoardResponse.useMutation({
    onSuccess: (data) => {
      setChessResponse(data as ChessResponse);
      setError(null);
    },
    onError: (error) => {
      setError(`Failed to get moves: ${error.message}`);
      setChessResponse(null);
    },
  });

  const handleFile = async (file: File | null) => {
    if (file?.type.startsWith("image/")) {
      setChessResponse(null);
      setError(null);
      setImagePreview(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        if (base64String) {
          getMovesMutation.mutate({ imageBase64: base64String });
        } else {
          setError("Failed to read image file.");
        }
      };
      reader.onerror = () => {
        setError("Failed to read image file.");
      };
    } else {
      setImagePreview(null);
      setChessResponse(null);
      setError(null);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handlePaste = async (e: ClipboardEvent<HTMLDivElement>) => {
    const file = e.clipboardData?.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <div
        className="w-full rounded-xl border-2 border-dashed border-gray-400 p-8 text-center"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPaste={handlePaste}
        tabIndex={0}
      >
        {getMovesMutation.isPending ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-white border-t-transparent"></div>
            <p>Analyzing Image...</p>
          </div>
        ) : imagePreview ? (
          <div className="flex flex-col items-center gap-4">
            <Image
              src={imagePreview}
              alt="Image preview"
              width={192}
              height={192}
              className="max-h-48 max-w-full rounded object-contain"
            />
            <p>
              Drop, paste, or{" "}
              <label
                htmlFor="file-upload"
                className="cursor-pointer font-bold text-[hsl(280,100%,70%)] underline"
              >
                click to upload
              </label>{" "}
              another image.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p>Drop an image here, paste from clipboard, or</p>
            <label
              htmlFor="file-upload"
              className="cursor-pointer rounded-lg bg-white/10 px-4 py-2 font-bold hover:bg-white/20"
            >
              Upload a file
            </label>
          </div>
        )}
        <input
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          disabled={getMovesMutation.isPending}
        />
      </div>
      {error && <p className="mt-4 text-red-500">{error}</p>}
      {chessResponse && !getMovesMutation.isPending && (
        <div className="mt-4 w-full rounded-lg border border-gray-600 bg-white/5 p-4 text-left">
          <h3 className="mb-2 text-lg font-semibold">Best Moves:</h3>
          {chessResponse.whiteBestMove ? (
            <div className="mb-2">
              <p>
                <strong>White:</strong> {chessResponse.whiteBestMove.from} to{" "}
                {chessResponse.whiteBestMove.to}
              </p>
              <p className="text-sm text-gray-400">
                {chessResponse.whiteBestMove.comments}
              </p>
            </div>
          ) : (
            <p>
              <strong>White:</strong> No move found or suggested.
            </p>
          )}
          {chessResponse.blackBestMove ? (
            <div>
              <p>
                <strong>Black:</strong> {chessResponse.blackBestMove.from} to{" "}
                {chessResponse.blackBestMove.to}
              </p>
              <p className="text-sm text-gray-400">
                {chessResponse.blackBestMove.comments}
              </p>
            </div>
          ) : (
            <p>
              <strong>Black:</strong> No move found or suggested.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
