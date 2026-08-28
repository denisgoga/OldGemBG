import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Monitor,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  LayoutGrid,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase, type HomepageBanner } from "@/lib/supabase";
import {
  uploadHomepageBannerFile,
  uploadHomepageBannerVideo,
  deleteVideoThumbnailAtUrl,
  isDataUrlThumbnail,
  isHostedVideoThumbnail,
  uploadDataUrlThumbnail,
} from "@/lib/videoThumbnailStorage";
import { Switch } from "@/components/ui/switch";
import { HomepageBannerAd } from "@/components/HomepageBannerAd";
import type { PublicHomepageBanner } from "@shared/api";
import {
  BANNER_DEVICE_VISIBILITY,
  BANNER_LAYOUT_WIDTH,
  HOMEPAGE_BANNER_SLOTS,
  deviceVisibilityLabel,
  getBannerSlotHint,
  getBannerSlotLabel,
  layoutWidthLabel,
  mapRowToPublicBanner,
  type BannerDeviceVisibility,
  type BannerLayoutWidth,
  type HomepageBannerSlotId,
} from "@shared/bannerSlots";
import { cn } from "@/lib/utils";

type FormMode = "idle" | "add" | "edit";

const DEFAULT_FORM = {
  name: "",
  slot: "home_below_intro" as HomepageBannerSlotId,
  device_visibility: "all" as BannerDeviceVisibility,
  layout_width: "auto" as BannerLayoutWidth,
  media_type: "image" as HomepageBanner["media_type"],
  image_url: "",
  video_url: "",
  html_content: "",
  link_url: "",
  size: "native" as HomepageBanner["size"],
  alt_text: "Advertisement",
  is_active: true,
};

function toPublicBanner(b: HomepageBanner): PublicHomepageBanner {
  return mapRowToPublicBanner(b as unknown as Record<string, unknown>);
}

export function BannersManager() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingVideo, setPendingVideo] = useState<File | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"all" | "mobile" | "desktop">(
    "all",
  );

  const fetchBanners = useCallback(async () => {
    const { data, error } = await supabase
      .from("homepage_banners")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) {
      setBanners([]);
      return;
    }
    setBanners((data as HomepageBanner[]) ?? []);
  }, []);

  useEffect(() => {
    void fetchBanners().finally(() => setLoading(false));
    const channel = supabase
      .channel("admin-banners")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "homepage_banners" },
        () => {
          void fetchBanners();
        },
      )
      .subscribe();
    return () => {
      void channel.unsubscribe();
    };
  }, [fetchBanners]);

  const stats = useMemo(() => {
    const active = banners.filter((b) => b.is_active).length;
    const mobile = banners.filter(
      (b) => b.device_visibility === "mobile" && b.is_active,
    ).length;
    const desktop = banners.filter(
      (b) => b.device_visibility === "desktop" && b.is_active,
    ).length;
    return { total: banners.length, active, mobile, desktop };
  }, [banners]);

  const grouped = useMemo(() => {
    return HOMEPAGE_BANNER_SLOTS.map((slot) => ({
      ...slot,
      items: banners.filter((b) => b.slot === slot.id),
    }));
  }, [banners]);

  const resetForm = () => {
    setFormMode("idle");
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setPendingImage(null);
    setPendingVideo(null);
    setImagePreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const buildPreview = (): PublicHomepageBanner => ({
    ...mapRowToPublicBanner({
      id: editingId ?? "preview",
      ...form,
      image_url: imagePreview || form.image_url,
      video_url: form.video_url.trim() || null,
      html_content: form.html_content.trim() || null,
      link_url: form.link_url.trim() || null,
      sort_order: 0,
    }),
  });

  const startAdd = (slot?: HomepageBannerSlotId) => {
    setFormMode("add");
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, slot: slot ?? DEFAULT_FORM.slot });
    setPendingImage(null);
    setPendingVideo(null);
    setImagePreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const startEdit = (b: HomepageBanner) => {
    setFormMode("edit");
    setEditingId(b.id);
    setForm({
      name: b.name ?? "",
      slot: b.slot ?? "home_below_intro",
      device_visibility: b.device_visibility ?? "all",
      layout_width: b.layout_width ?? "auto",
      media_type: b.media_type ?? "image",
      image_url: b.image_url ?? "",
      video_url: b.video_url ?? "",
      html_content: b.html_content ?? "",
      link_url: b.link_url ?? "",
      size: b.size ?? "native",
      alt_text: b.alt_text ?? "Advertisement",
      is_active: b.is_active,
    });
    setPendingImage(null);
    setPendingVideo(null);
    setImagePreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return b.media_type === "image" ? b.image_url : "";
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.media_type === "image") {
      if (!pendingImage && !form.image_url.trim()) {
        toast({ title: "Image required", variant: "destructive" });
        return;
      }
    } else if (form.media_type === "video") {
      if (!pendingVideo && !form.video_url.trim()) {
        toast({ title: "Video required", variant: "destructive" });
        return;
      }
    } else if (!form.html_content.trim()) {
      toast({ title: "HTML code required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let imageUrl = form.image_url.trim();
      let videoUrl = form.video_url.trim();
      const previous = editingId
        ? banners.find((x) => x.id === editingId)
        : undefined;

      if (form.media_type === "image") {
        if (pendingImage) {
          imageUrl = await uploadHomepageBannerFile(pendingImage);
          if (
            previous?.image_url &&
            isHostedVideoThumbnail(previous.image_url) &&
            previous.image_url !== imageUrl
          ) {
            await deleteVideoThumbnailAtUrl(previous.image_url);
          }
        } else if (isDataUrlThumbnail(imageUrl)) {
          imageUrl = await uploadDataUrlThumbnail(imageUrl);
        }
      } else if (form.media_type === "video" && pendingVideo) {
        videoUrl = await uploadHomepageBannerVideo(pendingVideo);
      }

      const slotPeers = banners.filter(
        (b) => b.slot === form.slot && b.id !== editingId,
      );
      const minOrder = slotPeers.reduce(
        (m, b) => Math.min(m, b.sort_order ?? 0),
        0,
      );

      const row = {
        name: form.name.trim(),
        slot: form.slot,
        device_visibility: form.device_visibility,
        layout_width: form.layout_width,
        media_type: form.media_type,
        image_url: form.media_type === "image" ? imageUrl : "",
        video_url: form.media_type === "video" ? videoUrl : "",
        html_content: form.media_type === "html" ? form.html_content : "",
        link_url: form.link_url.trim(),
        size: form.size,
        alt_text: form.alt_text.trim() || "Advertisement",
        is_active: form.is_active,
        sort_order: editingId
          ? (previous?.sort_order ?? minOrder - 1)
          : minOrder - 1,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("homepage_banners")
          .update(row)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Saved", description: "Banner updated." });
      } else {
        const { error } = await supabase.from("homepage_banners").insert([row]);
        if (error) throw error;
        toast({ title: "Saved", description: "Banner created." });
      }

      resetForm();
      await fetchBanners();
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Could not save banner",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    try {
      const { error } = await supabase
        .from("homepage_banners")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await fetchBanners();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const deleteBanner = async (id: string) => {
    const row = banners.find((b) => b.id === id);
    try {
      const { error } = await supabase
        .from("homepage_banners")
        .delete()
        .eq("id", id);
      if (error) throw error;
      if (row?.image_url && isHostedVideoThumbnail(row.image_url)) {
        await deleteVideoThumbnailAtUrl(row.image_url);
      }
      if (editingId === id) resetForm();
      await fetchBanners();
      toast({ title: "Deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const moveBanner = async (id: string, direction: -1 | 1) => {
    const ix = banners.findIndex((b) => b.id === id);
    const target = ix + direction;
    if (ix < 0 || target < 0 || target >= banners.length) return;
    const next = [...banners];
    [next[ix], next[target]] = [next[target], next[ix]];
    setBanners(next);
    try {
      await Promise.all(
        next.map((b, i) =>
          supabase
            .from("homepage_banners")
            .update({ sort_order: i, updated_at: new Date().toISOString() })
            .eq("id", b.id),
        ),
      );
    } catch {
      await fetchBanners();
    }
  };

  const previewBanner = buildPreview();
  const previewVariant =
    form.slot === "home_below_intro" || form.slot === "home_below_grid"
      ? "header"
      : "grid";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ad banners</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Place creatives on fixed homepage slots. Use separate banners for mobile
          and desktop in the same slot — each shows only on the chosen device.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Mobile-only", value: stats.mobile },
          { label: "Desktop-only", value: stats.desktop },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card px-4 py-3"
          >
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <LayoutGrid className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Placement map</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {HOMEPAGE_BANNER_SLOTS.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => startAdd(slot.id)}
              className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-left hover:border-primary/50 hover:bg-secondary/50 transition-colors"
            >
              <p className="text-xs font-semibold">{slot.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                {slot.hint}
              </p>
            </button>
          ))}
        </div>
      </div>

      {formMode !== "idle" ? (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-primary/30 bg-card p-5 space-y-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">
              {formMode === "edit" ? "Edit banner" : "New banner"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          <section className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Placement & devices
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Mobile popunder strip"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slot</label>
                <select
                  value={form.slot}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      slot: e.target.value as HomepageBannerSlotId,
                    }))
                  }
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
                >
                  {HOMEPAGE_BANNER_SLOTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {getBannerSlotHint(form.slot)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Show on</label>
              <div className="grid grid-cols-3 gap-2">
                {BANNER_DEVICE_VISIBILITY.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, device_visibility: v }))
                    }
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition-colors",
                      form.device_visibility === v
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/20 hover:border-primary/40",
                    )}
                  >
                    {v === "mobile" ? (
                      <Smartphone className="h-4 w-4" />
                    ) : v === "desktop" ? (
                      <Monitor className="h-4 w-4" />
                    ) : (
                      <span className="text-[10px] font-bold">ALL</span>
                    )}
                    {deviceVisibilityLabel(v)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Layout width</label>
              <div className="grid grid-cols-3 gap-2">
                {BANNER_LAYOUT_WIDTH.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, layout_width: v }))}
                    className={cn(
                      "rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors",
                      form.layout_width === v
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/20 hover:border-primary/40",
                    )}
                  >
                    {layoutWidthLabel(v)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Creative
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["image", "Image"],
                  ["video", "Video"],
                  ["html", "HTML / Script"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, media_type: value }))}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium",
                    form.media_type === value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card hover:border-primary/50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {form.media_type === "image" ? (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImagePreview((prev) => {
                      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
                      return URL.createObjectURL(file);
                    });
                    setPendingImage(file);
                    setForm((p) => ({ ...p, image_url: "" }));
                  }}
                  className="w-full text-sm"
                />
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, image_url: e.target.value }))
                  }
                  placeholder="Or paste image URL"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
                  disabled={!!pendingImage}
                />
              </div>
            ) : null}

            {form.media_type === "video" ? (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPendingVideo(file);
                      setForm((p) => ({ ...p, video_url: "" }));
                    }
                  }}
                  className="w-full text-sm"
                />
                <input
                  type="url"
                  value={form.video_url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, video_url: e.target.value }))
                  }
                  placeholder="Or paste video URL"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
                  disabled={!!pendingVideo}
                />
              </div>
            ) : null}

            {form.media_type === "html" ? (
              <textarea
                value={form.html_content}
                onChange={(e) =>
                  setForm((p) => ({ ...p, html_content: e.target.value }))
                }
                rows={10}
                spellCheck={false}
                placeholder={'<iframe ...></iframe>\n<script src="..."></script>'}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-xs font-mono leading-relaxed resize-y min-h-[12rem]"
              />
            ) : null}

            {form.media_type !== "html" ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Click URL
                  </label>
                  <input
                    type="url"
                    value={form.link_url}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, link_url: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Size</label>
                  <select
                    value={form.size}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        size: e.target.value as HomepageBanner["size"],
                      }))
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
                  >
                    <option value="native">Native (grid cell)</option>
                    <option value="300x250">300 × 250</option>
                    <option value="300x100">300 × 100</option>
                    <option value="728x90">728 × 90 leaderboard</option>
                  </select>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, is_active: !!v }))
                  }
                />
                Active on site
              </label>
              <input
                type="text"
                value={form.alt_text}
                onChange={(e) =>
                  setForm((p) => ({ ...p, alt_text: e.target.value }))
                }
                placeholder="Alt text"
                className="flex-1 min-w-[160px] px-3 py-2 bg-input border border-border rounded-lg text-sm"
              />
            </div>
          </section>

          <section className="border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Live preview
              </p>
              <div className="flex gap-1 rounded-lg border border-border p-0.5">
                {(["all", "mobile", "desktop"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPreviewDevice(d)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-medium capitalize",
                      previewDevice === d
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div
              className={cn(
                "rounded-lg border border-dashed border-border bg-secondary/20 p-4",
                previewDevice === "mobile" && "max-w-[390px] mx-auto",
                previewDevice === "desktop" && "min-h-[120px]",
                form.device_visibility === "mobile" && previewDevice === "desktop" && "opacity-40",
                form.device_visibility === "desktop" && previewDevice === "mobile" && "opacity-40",
              )}
            >
              <HomepageBannerAd banner={previewBanner} variant={previewVariant} />
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : formMode === "edit" ? "Save changes" : "Create banner"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => startAdd()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add banner
        </button>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading banners…</p>
      ) : banners.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
          No banners yet. Run migration{" "}
          <code className="text-xs bg-secondary px-1 rounded">
            20260828140000_homepage_banners_slots_devices.sql
          </code>{" "}
          then add your first creative.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
              <div key={group.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-secondary/30 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{group.label}</p>
                    <p className="text-[11px] text-muted-foreground">{group.hint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startAdd(group.id)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    + Add to this slot
                  </button>
                </div>
                {group.items.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-muted-foreground text-center">
                    No banners in this slot yet.
                  </p>
                ) : (
                <ul className="divide-y divide-border">
                  {group.items.map((b) => {
                    const pub = toPublicBanner(b);
                    const globalIx = banners.findIndex((x) => x.id === b.id);
                    return (
                      <li
                        key={b.id}
                        className="flex flex-wrap gap-4 p-4 items-start sm:items-center"
                      >
                        <div
                          className={cn(
                            "shrink-0 overflow-hidden rounded-lg border border-border bg-secondary/20",
                            b.media_type === "html" ? "w-full max-w-[280px]" : "w-[140px]",
                          )}
                        >
                          <HomepageBannerAd
                            banner={pub}
                            variant={
                              group.zone === "grid" ? "grid" : "header"
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-[180px] space-y-1">
                          <p className="text-sm font-medium">
                            {b.name?.trim() || "Untitled banner"}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {b.media_type} · {deviceVisibilityLabel(b.device_visibility)} ·{" "}
                            {layoutWidthLabel(b.layout_width)} · {b.size}
                          </p>
                          {!b.is_active ? (
                            <span className="inline-block text-[10px] font-semibold uppercase text-amber-500">
                              Hidden
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={b.is_active}
                            onCheckedChange={(v) => void toggleActive(b.id, !!v)}
                          />
                          <button
                            type="button"
                            disabled={globalIx <= 0}
                            onClick={() => void moveBanner(b.id, -1)}
                            className="p-1.5 rounded hover:bg-secondary disabled:opacity-30"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={globalIx >= banners.length - 1}
                            onClick={() => void moveBanner(b.id, 1)}
                            className="p-1.5 rounded hover:bg-secondary disabled:opacity-30"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              formMode === "idle"
                                ? startEdit(b)
                                : toast({ title: "Finish editing first" })
                            }
                            className="p-1.5 rounded hover:bg-primary/15 text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteBanner(b.id)}
                            className="p-1.5 rounded hover:bg-destructive/15 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                )}
              </div>
          ))}
        </div>
      )}
    </div>
  );
}
