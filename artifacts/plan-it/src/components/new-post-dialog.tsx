import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostInputType, useCreatePost, useRequestUploadUrl } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  type: z.nativeEnum(PostInputType),
  caption: z.string().optional(),
});

export function NewPostDialog({ accountId, children }: { accountId: string, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createPost = useCreatePost();
  const requestUploadUrl = useRequestUploadUrl();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "SINGLE",
      caption: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!file) {
      toast({ title: "Please select a file to upload", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      // 1. Request upload URL
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: {
          name: file.name,
          size: file.size,
          contentType: file.type,
        }
      });

      // 2. Upload to GCS directly
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      // 3. Create post with the media
      const mediaType = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
      const mediaUrl = `/api/storage${objectPath}`;

      await createPost.mutateAsync({
        accountId,
        data: {
          type: values.type,
          caption: values.caption || null,
          scheduledAt: null,
          media: [{
            url: mediaUrl,
            type: mediaType as "IMAGE" | "VIDEO"
          }]
        }
      });

      toast({ title: "Post created successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${accountId}/posts`] });
      setOpen(false);
      form.reset();
      setFile(null);
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
      if (!val) {
        form.reset();
        setFile(null);
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <SelectItem value="SINGLE">Single Image/Video</SelectItem>
                      <SelectItem value="CAROUSEL">Carousel</SelectItem>
                      <SelectItem value="REEL">Reel</SelectItem>
                      <SelectItem value="STORY">Story</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Media</FormLabel>
              <FormControl>
                <Input 
                  type="file" 
                  accept="image/*,video/*" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </FormControl>
            </FormItem>

            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caption</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Write your caption here..." 
                      className="min-h-[120px] resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isUploading || !file}>
                {isUploading ? "Uploading..." : "Create Draft"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
