import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostInputType, useCreatePost, useRequestUploadUrl, getListPostsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Image as ImageIcon } from "lucide-react";

const formSchema = z.object({
  type: z.nativeEnum(PostInputType),
  caption: z.string().optional(),
});

export function NewPostDialog({ accountId, children }: { accountId: string, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPost = useCreatePost();
  const requestUploadUrl = useRequestUploadUrl();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: "SINGLE", caption: "" },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!file) {
      toast({ title: "Please select a media file", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type },
      });

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const mediaType = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
      const mediaUrl = `/api/storage${objectPath}`;

      await createPost.mutateAsync({
        accountId,
        data: {
          type: values.type,
          caption: values.caption || null,
          scheduledAt: null,
          media: [{ url: mediaUrl, type: mediaType as "IMAGE" | "VIDEO" }],
        },
      });

      toast({ title: "Draft created" });
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey(accountId) });
      setOpen(false);
      form.reset();
      setFile(null);
      setPreview(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to create post", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) { form.reset(); setFile(null); setPreview(null); }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New Draft Post</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single Image / Video</SelectItem>
                      <SelectItem value="CAROUSEL">Carousel</SelectItem>
                      <SelectItem value="REEL">Reel</SelectItem>
                      <SelectItem value="STORY">Story</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File input — plain HTML, not inside FormField to avoid hook context error */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Media</label>
              <label
                className="flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed border-border bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors overflow-hidden"
                style={{ minHeight: preview ? "auto" : "140px" }}
              >
                {preview ? (
                  file?.type.startsWith("video/") ? (
                    <video src={preview} className="w-full max-h-64 object-contain" />
                  ) : (
                    <img src={preview} alt="Preview" className="w-full max-h-64 object-contain" />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <Upload size={28} />
                    <span className="text-sm">Click to select image or video</span>
                    <span className="text-xs opacity-60">JPG, PNG, MP4, MOV</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {file && (
                <p className="text-xs text-muted-foreground truncate">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
              )}
            </div>

            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caption</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your caption..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isUploading || !file} className="min-w-[120px]">
                {isUploading ? "Uploading..." : "Save Draft"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
