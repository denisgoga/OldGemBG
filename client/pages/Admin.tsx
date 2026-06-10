import { useState, useEffect } from "react";
import { Trash2, Plus, Settings, LogOut, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  supabase,
  type Video,
  type PopupSettings,
  type SiteSettings,
  type HomepageBanner,
} from "@/lib/supabase";
import {
  deleteVideoThumbnailAtUrl,
  isDataUrlThumbnail,
  isHostedVideoThumbnail,
  uploadDataUrlThumbnail,
  uploadVideoThumbnailFile,
  uploadHomepageBannerFile,
} from "@/lib/videoThumbnailStorage";
import { Switch } from "@/components/ui/switch";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/locales";
import { getPopupStringsForLocale, getSiteStringsForLocale } from "@/i18n/dbTranslation";

export default function Admin() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [popupSettings, setPopupSettings] = useState<PopupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    duration: "",
    thumbnail: "",
  });
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [pendingThumbnailFile, setPendingThumbnailFile] = useState<File | null>(
    null,
  );
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingPopup, setEditingPopup] = useState(false);
  const [popupForm, setPopupForm] = useState({
    title: "",
    description: "",
    button_text: "",
    waiting_title: "",
    waiting_description: "",
    waiting_button_text: "",
    direct_link_hint: "",
    affiliate_link: "",
    affiliate_link_a: "",
    affiliate_link_b: "",
    affiliate_split_a: 50,
  });
  const [hidePopupSaving, setHidePopupSaving] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [homepageBanners, setHomepageBanners] = useState<HomepageBanner[]>([]);
  const [bannerFormMode, setBannerFormMode] = useState<
    "idle" | "add" | "edit"
  >("idle");
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState({
    image_url: "",
    link_url: "",
    size: "300x250" as HomepageBanner["size"],
    alt_text: "Advertisement",
    is_active: true,
  });
  const [bannerImagePreview, setBannerImagePreview] = useState("");
  const [bannerPendingFile, setBannerPendingFile] = useState<File | null>(
    null,
  );
  const [bannerSaving, setBannerSaving] = useState(false);
  const [editingSite, setEditingSite] = useState(false);
  const [siteForm, setSiteForm] = useState({
    meta_title: "",
    meta_description: "",
    og_image: "",
    landing_headline: "",
    landing_subhead: "",
    seo_intro: "",
    footer_text: "",
    hide_landing_headline: false,
    hide_landing_subhead: false,
    hide_seo_intro: false,
  });
  const navigate = useNavigate();
  const { locale } = useParams();
  const localeSegment = locale ?? "en";
  const [selectedLocale, setSelectedLocale] = useState<Locale>(
    () => localeSegment as Locale,
  );
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate(`/${localeSegment}/admin-login`);
  };

  // Load initial data
  useEffect(() => {
    fetchVideos();
    fetchPopupSettings();
    fetchSiteSettings();
    fetchHomepageBanners();
    subscribeToChanges();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast({
        title: "Error",
        description: "Failed to load videos",
        variant: "destructive",
      });
    }
  };

  const fetchPopupSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("popup_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      setPopupSettings(data);
      if (data) {
        const strings = getPopupStringsForLocale(data, selectedLocale);
        setPopupForm({
          title: strings.title,
          description: strings.description,
          button_text: strings.button_text,
          waiting_title:
            strings.waiting_title ??
            data.waiting_title ??
            "Waiting for Registration",
          waiting_description:
            strings.waiting_description ??
            data.waiting_description ??
            "Please complete your free registration in the new window. Once you finish, you'll have full access to all premium videos.",
          waiting_button_text:
            strings.waiting_button_text ??
            data.waiting_button_text ??
            "Open Link Again",
          direct_link_hint:
            strings.direct_link_hint ??
            data.direct_link_hint ??
            "Almost there - finish signup to watch.",
          affiliate_link: data.affiliate_link,
          affiliate_link_a: (data.affiliate_link_a ?? "").toString(),
          affiliate_link_b: (data.affiliate_link_b ?? "").toString(),
          affiliate_split_a: Math.min(
            100,
            Math.max(0, Number(data.affiliate_split_a ?? 50)),
          ),
        });
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching popup settings:", error);
      setLoading(false);
    }
  };

  const fetchHomepageBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("homepage_banners")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setHomepageBanners(data || []);
    } catch {
      setHomepageBanners([]);
    }
  };

  const resetBannerForm = () => {
    setBannerFormMode("idle");
    setEditingBannerId(null);
    setBannerForm({
      image_url: "",
      link_url: "",
      size: "300x250",
      alt_text: "Advertisement",
      is_active: true,
    });
    setBannerPendingFile(null);
    setBannerImagePreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const startAddBanner = () => {
    setBannerFormMode("add");
    setEditingBannerId(null);
    setBannerForm({
      image_url: "",
      link_url: "",
      size: "300x250",
      alt_text: "Advertisement",
      is_active: true,
    });
    setBannerPendingFile(null);
    setBannerImagePreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const startEditBanner = (b: HomepageBanner) => {
    setBannerFormMode("edit");
    setEditingBannerId(b.id);
    setBannerForm({
      image_url: b.image_url,
      link_url: b.link_url ?? "",
      size: b.size,
      alt_text: b.alt_text || "Advertisement",
      is_active: b.is_active,
    });
    setBannerPendingFile(null);
    setBannerImagePreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return b.image_url;
    });
  };

  const handleBannerImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerImagePreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setBannerPendingFile(file);
    setBannerForm((p) => ({ ...p, image_url: "" }));
  };

  const handleBannerToggleActive = async (
    id: string,
    is_active: boolean,
  ) => {
    try {
      const { error } = await supabase
        .from("homepage_banners")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await fetchHomepageBanners();
      toast({
        title: "Updated",
        description: is_active ? "Banner is visible on the site." : "Banner is hidden.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Could not update banner. Run the homepage_banners migration?",
        variant: "destructive",
      });
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasImage =
      !!bannerPendingFile || bannerForm.image_url.trim().length > 0;
    if (!hasImage) {
      toast({
        title: "Error",
        description: "Add an image file or paste an image URL",
        variant: "destructive",
      });
      return;
    }

    setBannerSaving(true);
    try {
      let imageUrl = bannerForm.image_url.trim();
      const previousRow = editingBannerId
        ? homepageBanners.find((x) => x.id === editingBannerId)
        : undefined;

      if (bannerPendingFile) {
        imageUrl = await uploadHomepageBannerFile(bannerPendingFile);
        if (
          previousRow?.image_url &&
          isHostedVideoThumbnail(previousRow.image_url) &&
          previousRow.image_url !== imageUrl
        ) {
          await deleteVideoThumbnailAtUrl(previousRow.image_url);
        }
      } else if (isDataUrlThumbnail(imageUrl)) {
        imageUrl = await uploadDataUrlThumbnail(imageUrl);
        if (
          previousRow?.image_url &&
          isHostedVideoThumbnail(previousRow.image_url) &&
          previousRow.image_url !== imageUrl
        ) {
          await deleteVideoThumbnailAtUrl(previousRow.image_url);
        }
      }

      const row = {
        image_url: imageUrl,
        link_url: bannerForm.link_url.trim(),
        size: bannerForm.size,
        alt_text:
          bannerForm.alt_text.trim().length > 0
            ? bannerForm.alt_text.trim()
            : "Advertisement",
        is_active: bannerForm.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingBannerId) {
        const { error } = await supabase
          .from("homepage_banners")
          .update(row)
          .eq("id", editingBannerId);
        if (error) throw error;
        toast({ title: "Saved", description: "Banner updated." });
      } else {
        const { error } = await supabase.from("homepage_banners").insert([
          {
            ...row,
            sort_order: homepageBanners.length,
          },
        ]);
        if (error) throw error;
        toast({ title: "Saved", description: "Banner added." });
      }

      resetBannerForm();
      await fetchHomepageBanners();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save banner",
        variant: "destructive",
      });
    } finally {
      setBannerSaving(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    const row = homepageBanners.find((b) => b.id === id);
    try {
      const { error } = await supabase.from("homepage_banners").delete().eq("id", id);
      if (error) throw error;
      if (row?.image_url && isHostedVideoThumbnail(row.image_url)) {
        await deleteVideoThumbnailAtUrl(row.image_url);
      }
      if (editingBannerId === id) resetBannerForm();
      await fetchHomepageBanners();
      toast({ title: "Deleted", description: "Banner removed." });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to delete banner",
        variant: "destructive",
      });
    }
  };

  const handleMoveBanner = async (
    id: string,
    direction: "up" | "down",
  ) => {
    const ix = homepageBanners.findIndex((b) => b.id === id);
    if (
      (direction === "up" && ix <= 0) ||
      (direction === "down" && ix >= homepageBanners.length - 1)
    ) {
      return;
    }

    const next = [...homepageBanners];
    const j = direction === "up" ? ix - 1 : ix + 1;
    [next[ix], next[j]] = [next[j], next[ix]];
    try {
      const updatedAt = new Date().toISOString();
      const results = await Promise.all(
        next.map((row, sort_order) =>
          supabase
            .from("homepage_banners")
            .update({ sort_order, updated_at: updatedAt })
            .eq("id", row.id),
        ),
      );
      const firstErr = results.find((r) => r.error)?.error;
      if (firstErr) throw firstErr;
      setHomepageBanners(next);
      toast({
        title: "Reordered",
        description:
          direction === "up" ? "Banner moved up." : "Banner moved down.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to reorder",
        variant: "destructive",
      });
      await fetchHomepageBanners();
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      setSiteSettings(data);
      if (data) {
        const strings = getSiteStringsForLocale(data, selectedLocale);
        setSiteForm({
          meta_title: strings.meta_title ?? "",
          meta_description: strings.meta_description ?? "",
          og_image: data.og_image ?? "",
          landing_headline: strings.landing_headline ?? "",
          landing_subhead: strings.landing_subhead ?? "",
          seo_intro: strings.seo_intro ?? "",
          footer_text: strings.footer_text ?? "",
          hide_landing_headline: strings.hide_landing_headline,
          hide_landing_subhead: strings.hide_landing_subhead,
          hide_seo_intro: strings.hide_seo_intro,
        });
      }
    } catch {
      // site_settings table may not exist yet
      setSiteSettings(null);
    }
  };

  useEffect(() => {
    if (!popupSettings) return;
    const strings = getPopupStringsForLocale(popupSettings, selectedLocale);
    setPopupForm((prev) => ({
      ...prev,
      title: strings.title,
      description: strings.description,
      button_text: strings.button_text,
      waiting_title: strings.waiting_title ?? "",
      waiting_description: strings.waiting_description ?? "",
      waiting_button_text: strings.waiting_button_text ?? "",
      direct_link_hint:
        strings.direct_link_hint ??
        popupSettings.direct_link_hint ??
        "Almost there - finish signup to watch.",
      affiliate_link: popupSettings.affiliate_link,
      affiliate_link_a: (popupSettings.affiliate_link_a ?? "").toString(),
      affiliate_link_b: (popupSettings.affiliate_link_b ?? "").toString(),
      affiliate_split_a: Math.min(
        100,
        Math.max(0, Number(popupSettings.affiliate_split_a ?? prev.affiliate_split_a ?? 50)),
      ),
    }));
  }, [popupSettings, selectedLocale]);

  useEffect(() => {
    if (!siteSettings) return;
    const strings = getSiteStringsForLocale(siteSettings, selectedLocale);
    setSiteForm({
      meta_title: strings.meta_title ?? "",
      meta_description: strings.meta_description ?? "",
      og_image: siteSettings.og_image ?? "",
      landing_headline: strings.landing_headline ?? "",
      landing_subhead: strings.landing_subhead ?? "",
      seo_intro: strings.seo_intro ?? "",
      footer_text: strings.footer_text ?? "",
      hide_landing_headline: strings.hide_landing_headline,
      hide_landing_subhead: strings.hide_landing_subhead,
      hide_seo_intro: strings.hide_seo_intro,
    });
  }, [siteSettings, selectedLocale]);

  // Subscribe to real-time changes
  const subscribeToChanges = () => {
    const videosChannel = supabase
      .channel("videos-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "videos" },
        () => {
          fetchVideos();
        }
      )
      .subscribe();

    const popupChannel = supabase
      .channel("popup-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "popup_settings" },
        () => {
          fetchPopupSettings();
        }
      )
      .subscribe();

    const siteChannel = supabase
      .channel("site-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => {
          fetchSiteSettings();
        },
      )
      .subscribe();

    const bannersChannel = supabase
      .channel("homepage-banners-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "homepage_banners" },
        () => {
          fetchHomepageBanners();
        },
      )
      .subscribe();

    return () => {
      videosChannel.unsubscribe();
      popupChannel.unsubscribe();
      siteChannel.unsubscribe();
      bannersChannel.unsubscribe();
    };
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbnailPreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setPendingThumbnailFile(file);
    setFormData((prev) => ({
      ...prev,
      thumbnail: "",
    }));
  };

  const resetVideoForm = () => {
    setFormData({ title: "", duration: "", thumbnail: "" });
    setThumbnailPreview((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
    setPendingThumbnailFile(null);
  };

  /** Resolves public Storage URL (or keeps external http URL). Migrates legacy data: URLs on save. */
  const resolveThumbnailForSave = async (): Promise<string> => {
    if (pendingThumbnailFile) {
      return uploadVideoThumbnailFile(pendingThumbnailFile);
    }
    const raw = formData.thumbnail.trim();
    if (!raw) throw new Error("Missing thumbnail");
    if (isDataUrlThumbnail(raw)) {
      return uploadDataUrlThumbnail(raw);
    }
    return raw;
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasThumb =
      !!pendingThumbnailFile || formData.thumbnail.trim().length > 0;
    if (!formData.title || !formData.duration || !hasThumb) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setThumbnailUploading(true);
    try {
      const thumbUrl = await resolveThumbnailForSave();
      const previousThumb = editingVideoId
        ? videos.find((v) => v.id === editingVideoId)?.thumbnail
        : undefined;

      if (editingVideoId) {
        const { error } = await supabase
          .from("videos")
          .update({
            title: formData.title,
            duration: formData.duration,
            thumbnail: thumbUrl,
          })
          .eq("id", editingVideoId);
        if (error) throw error;

        if (
          previousThumb &&
          isHostedVideoThumbnail(previousThumb) &&
          previousThumb !== thumbUrl
        ) {
          await deleteVideoThumbnailAtUrl(previousThumb);
        }

        setEditingVideoId(null);
        toast({ title: "Success", description: "Video updated!" });
      } else {
        const { error } = await supabase.from("videos").insert([
          {
            title: formData.title,
            duration: formData.duration,
            thumbnail: thumbUrl,
            sort_order: videos.length,
          },
        ]);
        if (error) throw error;
        toast({ title: "Success", description: "Video added successfully!" });
      }

      resetVideoForm();
      fetchVideos();
    } catch (error) {
      console.error("Error adding video:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save video",
        variant: "destructive",
      });
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    const row = videos.find((v) => v.id === id);
    try {
      const { error } = await supabase.from("videos").delete().eq("id", id);

      if (error) throw error;

      if (row?.thumbnail && isHostedVideoThumbnail(row.thumbnail)) {
        await deleteVideoThumbnailAtUrl(row.thumbnail);
      }

      await fetchVideos();
      if (editingVideoId === id) {
        setEditingVideoId(null);
        resetVideoForm();
      }
      toast({
        title: "Success",
        description: "Video deleted successfully!",
      });
    } catch (error) {
      console.error("Error deleting video:", error);
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      });
    }
  };

  const handleMoveVideo = async (id: string, direction: "up" | "down") => {
    const currentIndex = videos.findIndex((v) => v.id === id);
    if (
      (direction === "up" && currentIndex <= 0) ||
      (direction === "down" && currentIndex >= videos.length - 1)
    ) {
      return;
    }

    const newVideos = [...videos];
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    [newVideos[currentIndex], newVideos[swapIndex]] = [
      newVideos[swapIndex],
      newVideos[currentIndex],
    ];

    const a = newVideos[currentIndex];
    const b = newVideos[swapIndex];
    try {
      const { error: err1 } = await supabase
        .from("videos")
        .update({ sort_order: currentIndex })
        .eq("id", a.id);
      const { error: err2 } = await supabase
        .from("videos")
        .update({ sort_order: swapIndex })
        .eq("id", b.id);
      if (err1 || err2) throw err1 || err2;
      setVideos(newVideos);
      toast({ title: "Success", description: `Video moved ${direction}!` });
    } catch (error) {
      console.error("Error moving video:", error);
      toast({
        title: "Error",
        description: "Failed to save order",
        variant: "destructive",
      });
    }
  };

  const handleHidePopupChange = async (checked: boolean) => {
    if (!popupSettings) return;

    setHidePopupSaving(true);
    try {
      const { error } = await supabase
        .from("popup_settings")
        .update({
          hide_popup: checked,
          updated_at: new Date().toISOString(),
        })
        .eq("id", popupSettings.id);

      if (error) throw error;

      setPopupSettings((prev) =>
        prev ? { ...prev, hide_popup: checked } : prev,
      );
      toast({
        title: "Success",
        description: checked
          ? "Registration popup hidden — affiliate link opens directly."
          : "Registration popup is shown again.",
      });
    } catch (error) {
      console.error("Error updating hide popup setting:", error);
      toast({
        title: "Error",
        description: "Failed to update popup visibility",
        variant: "destructive",
      });
    } finally {
      setHidePopupSaving(false);
    }
  };

  const handleUpdatePopupSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!popupSettings) return;

    try {
      const nextPopupTranslations = {
        ...(popupSettings.popup_translations ?? {}),
        [selectedLocale]: {
          title: popupForm.title,
          description: popupForm.description,
          button_text: popupForm.button_text,
          waiting_title: popupForm.waiting_title,
          waiting_description: popupForm.waiting_description,
          waiting_button_text: popupForm.waiting_button_text,
          direct_link_hint: popupForm.direct_link_hint,
        },
      };

      const payload: Partial<PopupSettings> & {
        popup_translations: typeof nextPopupTranslations;
      } = {
        popup_translations: nextPopupTranslations,
        affiliate_link: popupForm.affiliate_link,
        affiliate_link_a: popupForm.affiliate_link_a,
        affiliate_link_b: popupForm.affiliate_link_b,
        affiliate_split_a: Math.min(100, Math.max(0, Number(popupForm.affiliate_split_a ?? 50))),
        updated_at: new Date().toISOString(),
      };

      // Keep legacy "base columns" in sync for EN, so older data paths still work.
      if (selectedLocale === "en") {
        payload.title = popupForm.title;
        payload.description = popupForm.description;
        payload.button_text = popupForm.button_text;
        payload.waiting_title = popupForm.waiting_title;
        payload.waiting_description = popupForm.waiting_description;
        payload.waiting_button_text = popupForm.waiting_button_text;
        payload.direct_link_hint = popupForm.direct_link_hint;
      }

      const { error } = await supabase
        .from("popup_settings")
        .update(payload)
        .eq("id", popupSettings.id);

      if (error) throw error;

      setEditingPopup(false);
      toast({
        title: "Success",
        description: "Popup settings updated successfully!",
      });
    } catch (error) {
      console.error("Error updating popup settings:", error);
      toast({
        title: "Error",
        description: "Failed to update popup settings",
        variant: "destructive",
      });
    }
  };

  const handlePopupFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPopupForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSiteFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSiteForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSiteCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, checked } = e.target;
    setSiteForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleUpdateSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nextSiteTranslations = {
        ...(siteSettings?.site_translations ?? {}),
        [selectedLocale]: {
          meta_title: siteForm.meta_title,
          meta_description: siteForm.meta_description,
          landing_headline: siteForm.landing_headline,
          landing_subhead: siteForm.landing_subhead,
          seo_intro: siteForm.seo_intro,
          footer_text: siteForm.footer_text,
          hide_landing_headline: siteForm.hide_landing_headline,
          hide_landing_subhead: siteForm.hide_landing_subhead,
          hide_seo_intro: siteForm.hide_seo_intro,
        },
      };

      const payload: Partial<SiteSettings> & {
        site_translations: typeof nextSiteTranslations;
        og_image: string;
      } = {
        site_translations: nextSiteTranslations,
        og_image: siteForm.og_image,
        updated_at: new Date().toISOString(),
      };

      // Keep legacy "base columns" in sync for EN.
      if (selectedLocale === "en") {
        payload.meta_title = siteForm.meta_title;
        payload.meta_description = siteForm.meta_description;
        payload.landing_headline = siteForm.landing_headline;
        payload.landing_subhead = siteForm.landing_subhead;
        payload.seo_intro = siteForm.seo_intro;
        payload.footer_text = siteForm.footer_text;
      }
      if (siteSettings?.id) {
        const { error } = await supabase
          .from("site_settings")
          .update(payload)
          .eq("id", siteSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert([
            {
              ...payload,
              meta_title: payload.meta_title ?? null,
              meta_description: payload.meta_description ?? null,
              landing_headline: payload.landing_headline ?? null,
              landing_subhead: payload.landing_subhead ?? null,
              seo_intro: payload.seo_intro ?? null,
              footer_text: payload.footer_text ?? null,
            },
          ]);
        if (error) throw error;
        await fetchSiteSettings();
      }
      setEditingSite(false);
      toast({
        title: "Success",
        description: "Site & SEO settings saved.",
      });
    } catch (error) {
      console.error("Error saving site settings:", error);
      toast({
        title: "Error",
        description: "Failed to save. Is the site_settings table created?",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-8 h-8 text-primary animate-spin mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          <h1 className="text-xl font-semibold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-secondary/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage videos and popup settings
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-destructive/20 text-destructive hover:bg-destructive/30 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Add Video Form */}
          <div className="lg:col-span-2">
            <div className="space-y-8">
              {/* Add Video Section */}
              <div className="border border-border rounded-lg p-6 bg-card">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Plus size={20} className="text-primary" />
                  {editingVideoId ? "Edit Video" : "Add New Video"}
                </h2>

                <form onSubmit={handleAddVideo} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Video Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter video title"
                      className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Duration or photo count
                    </label>
                    <input
                      type="text"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      placeholder="e.g. 5:20 or 24 photos"
                      className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Thumbnail Image
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Files upload to Supabase Storage (bucket{" "}
                      <code className="rounded bg-secondary px-1">video-thumbnails</code>).
                      Legacy rows still using embedded images are converted to a URL when you
                      save.
                    </p>
                    <div className="flex gap-4">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                        onChange={handleThumbnailUpload}
                        className="flex-1"
                        disabled={thumbnailUploading}
                      />
                    </div>
                    {thumbnailPreview && (
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground mb-2">
                          Preview:
                        </p>
                        <img
                          src={thumbnailPreview}
                          alt="Preview"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="submit"
                      disabled={thumbnailUploading}
                      className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold py-3 rounded-lg transition-colors"
                    >
                      {thumbnailUploading
                        ? "Uploading…"
                        : editingVideoId
                          ? "Update Video"
                          : "Add Video"}
                    </button>
                    {editingVideoId && (
                      <button
                        type="button"
                        disabled={thumbnailUploading}
                        onClick={() => {
                          setEditingVideoId(null);
                          resetVideoForm();
                        }}
                        className="px-4 bg-secondary hover:bg-secondary/80 text-foreground font-semibold py-3 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Videos List */}
              <div className="border border-border rounded-lg p-6 bg-card">
                <h2 className="text-xl font-bold mb-6">
                  Videos ({videos.length})
                </h2>

                {videos.length > 0 ? (
                  <div className="space-y-4">
                    {videos.map((video, index) => (
                      <div
                        key={video.id}
                        className="flex gap-4 p-4 bg-secondary rounded-lg border border-border hover:border-primary transition-colors items-center"
                      >
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold">{video.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Duration: {video.duration}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setPendingThumbnailFile(null);
                            setThumbnailPreview((prev) => {
                              if (prev.startsWith("blob:"))
                                URL.revokeObjectURL(prev);
                              return video.thumbnail;
                            });
                            setEditingVideoId(video.id);
                            setFormData({
                              title: video.title,
                              duration: video.duration,
                              thumbnail: video.thumbnail,
                            });
                          }}
                          className="p-2 hover:bg-primary/20 rounded-lg text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleMoveVideo(video.id, "up")}
                            disabled={index === 0}
                            className="p-2 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-primary transition-colors"
                            title="Move up"
                          >
                            <ArrowUp size={18} />
                          </button>
                          <button
                            onClick={() => handleMoveVideo(video.id, "down")}
                            disabled={index === videos.length - 1}
                            className="p-2 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-primary transition-colors"
                            title="Move down"
                          >
                            <ArrowDown size={18} />
                          </button>
                        </div>
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="p-2 hover:bg-destructive/20 rounded-lg text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No videos added yet. Add one to get started!
                  </p>
                )}
              </div>

              {/* Homepage grid banners (after every 3 thumbnails on the site) */}
              <div className="border border-border rounded-lg p-6 bg-card">
                <h2 className="text-xl font-bold mb-2">Homepage banners</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  One banner slot is shown after each group of three video thumbnails. If you add
                  several active banners, they rotate in list order. Sizes: 300×250, 300×100, or{" "}
                  Native (matches thumbnail cards: same height as the grid thumbnails, one-column
                  width per breakpoint).
                </p>

                {bannerFormMode !== "idle" ? (
                  <form onSubmit={handleSaveBanner} className="space-y-4 mb-8">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Banner image
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Upload (stored in{" "}
                        <code className="rounded bg-secondary px-1">video-thumbnails</code>{" "}
                        under <code className="rounded bg-secondary px-1">banners/</code>) or
                        paste a URL.
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                        onChange={handleBannerImageFile}
                        className="w-full"
                        disabled={bannerSaving}
                      />
                      <input
                        type="url"
                        value={bannerForm.image_url}
                        onChange={(e) =>
                          setBannerForm((p) => ({
                            ...p,
                            image_url: e.target.value,
                          }))
                        }
                        placeholder="https://…"
                        className="w-full mt-2 px-4 py-2 bg-input border border-border rounded-lg text-sm"
                        disabled={bannerSaving || !!bannerPendingFile}
                      />
                    </div>
                    {bannerImagePreview && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Preview</p>
                        <img
                          src={bannerImagePreview}
                          alt=""
                          className="max-w-[300px] max-h-[250px] object-contain rounded border border-border"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Click URL (optional)
                      </label>
                      <input
                        type="url"
                        value={bannerForm.link_url}
                        onChange={(e) =>
                          setBannerForm((p) => ({ ...p, link_url: e.target.value }))
                        }
                        placeholder="https://…"
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm"
                        disabled={bannerSaving}
                      />
                    </div>
                    <div className="flex flex-wrap gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium mb-1">Size</label>
                        <select
                          value={bannerForm.size}
                          onChange={(e) =>
                            setBannerForm((p) => ({
                              ...p,
                              size: e.target.value as HomepageBanner["size"],
                            }))
                          }
                          className="px-3 py-2 bg-input border border-border rounded-lg text-sm"
                          disabled={bannerSaving}
                        >
                          <option value="300x250">300 × 250</option>
                          <option value="300x100">300 × 100</option>
                          <option value="native">Native (same as thumbnails)</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <span>Visible on site</span>
                        <Switch
                          checked={bannerForm.is_active}
                          onCheckedChange={(v) =>
                            setBannerForm((p) => ({ ...p, is_active: !!v }))
                          }
                          disabled={bannerSaving}
                        />
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Alt text</label>
                      <input
                        type="text"
                        value={bannerForm.alt_text}
                        onChange={(e) =>
                          setBannerForm((p) => ({
                            ...p,
                            alt_text: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-sm"
                        disabled={bannerSaving}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={bannerSaving}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold py-2 rounded-lg text-sm"
                      >
                        {bannerSaving ? "Saving…" : editingBannerId ? "Update banner" : "Add banner"}
                      </button>
                      <button
                        type="button"
                        disabled={bannerSaving}
                        onClick={resetBannerForm}
                        className="px-4 bg-secondary hover:bg-secondary/80 text-foreground font-semibold py-2 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={startAddBanner}
                    className="mb-6 w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                  >
                    Add banner
                  </button>
                )}

                {homepageBanners.length > 0 ? (
                  <ul className="space-y-3">
                    {homepageBanners.map((b, bi) => (
                      <li
                        key={b.id}
                        className="flex flex-wrap gap-3 p-4 bg-secondary rounded-lg border border-border items-center"
                      >
                        <img
                          src={b.image_url}
                          alt=""
                          className="w-[120px] h-[60px] object-contain rounded border border-border bg-card shrink-0"
                        />
                        <div className="flex-1 min-w-[160px]">
                          <p className="text-xs text-muted-foreground">{b.size}</p>
                          {b.link_url ? (
                            <p className="text-xs break-all mt-1">{b.link_url}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">No click URL</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">Active</span>
                          <Switch
                            checked={b.is_active}
                            onCheckedChange={(v) =>
                              handleBannerToggleActive(b.id, !!v)
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={bi === 0}
                            onClick={() => handleMoveBanner(b.id, "up")}
                            className="p-1.5 hover:bg-primary/20 disabled:opacity-40 rounded text-primary"
                            title="Move up"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            type="button"
                            disabled={bi === homepageBanners.length - 1}
                            onClick={() => handleMoveBanner(b.id, "down")}
                            className="p-1.5 hover:bg-primary/20 disabled:opacity-40 rounded text-primary"
                            title="Move down"
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            bannerFormMode === "idle"
                              ? startEditBanner(b)
                              : toast({
                                  title: "Finish or cancel editing",
                                  description:
                                    "Save or cancel the open banner form first.",
                                })
                          }
                          className="p-2 hover:bg-primary/20 rounded-lg text-primary"
                          title="Edit"
                          disabled={
                            bannerFormMode !== "idle" && editingBannerId !== b.id
                          }
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            bannerFormMode === "idle"
                              ? void handleDeleteBanner(b.id)
                              : toast({
                                  title: "Finish or cancel editing",
                                  description:
                                    "Save or cancel the open banner form first.",
                                })
                          }
                          className="p-2 hover:bg-destructive/20 rounded-lg text-destructive disabled:opacity-40"
                          title="Delete"
                          disabled={bannerFormMode !== "idle"}
                        >
                          <Trash2 size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">
                    No banners yet. Run migrations in{" "}
                    <code className="rounded bg-secondary px-1 text-xs">supabase/migrations/</code>{" "}
                    for <code className="rounded bg-secondary px-1 text-xs">homepage_banners</code>{" "}
                    (and the Native size ALTER if applicable), then add a banner above.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Site & SEO + Popup Settings */}
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">Edit language</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Saves fields into JSONB translations for the selected language.
                  </p>
                </div>
                <select
                  value={selectedLocale}
                  onChange={(e) => setSelectedLocale(e.target.value as Locale)}
                  className="px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={editingPopup || editingSite}
                >
                  {SUPPORTED_LOCALES.map((l) => (
                    <option key={l} value={l}>
                      {l === "en"
                        ? "English"
                        : l === "de"
                          ? "German"
                          : l === "it"
                            ? "Italian"
                            : l === "es"
                              ? "Spanish"
                              : "French"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Site & SEO */}
            <div className="border border-border rounded-lg p-6 bg-card sticky top-24">
              <h2 className="text-xl font-bold mb-4">Site & SEO</h2>
              {!siteSettings && !editingSite ? (
                <p className="text-sm text-muted-foreground mb-4">
                  Create the <code className="text-xs bg-secondary px-1 rounded">site_settings</code> table in Supabase (see <code className="text-xs bg-secondary px-1 rounded">supabase/migrations/</code>) to edit meta title, description, and landing copy here.
                </p>
              ) : null}
              {!editingSite ? (
                <>
                  <div className="text-sm space-y-2 mb-4">
                    <p><span className="text-muted-foreground">Meta title:</span> {siteForm.meta_title || "—"}</p>
                    <p><span className="text-muted-foreground">Landing headline:</span> {siteForm.landing_headline || "—"}</p>
                  </div>
                  <button
                    onClick={() => setEditingSite(true)}
                    className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-semibold py-2 rounded-lg transition-colors"
                  >
                    {siteSettings ? "Edit Site & SEO" : "Add Site Settings"}
                  </button>
                </>
              ) : (
                <form onSubmit={handleUpdateSiteSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Meta title (SEO)</label>
                    <input type="text" name="meta_title" value={siteForm.meta_title} onChange={handleSiteFormChange} className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="OldGem.Net - Free Premium..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Meta description (SEO)</label>
                    <textarea name="meta_description" value={siteForm.meta_description} onChange={handleSiteFormChange} rows={2} className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">OG / Share image URL</label>
                    <input type="url" name="og_image" value={siteForm.og_image} onChange={handleSiteFormChange} className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="https://oldgem.net/android-chrome-512x512.png" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Landing headline</label>
                    <input type="text" name="landing_headline" value={siteForm.landing_headline} onChange={handleSiteFormChange} className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Featured Content" />
                    <label className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="hide_landing_headline"
                        checked={siteForm.hide_landing_headline}
                        onChange={handleSiteCheckboxChange}
                      />
                      Hide this section
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Landing subhead</label>
                    <input type="text" name="landing_subhead" value={siteForm.landing_subhead} onChange={handleSiteFormChange} className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Browse our premium collection..." />
                    <label className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="hide_landing_subhead"
                        checked={siteForm.hide_landing_subhead}
                        onChange={handleSiteCheckboxChange}
                      />
                      Hide this section
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">SEO intro (short paragraph under headline)</label>
                    <textarea name="seo_intro" value={siteForm.seo_intro} onChange={handleSiteFormChange} rows={3} className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" placeholder="Optional. Shown on homepage for SEO." />
                    <label className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="hide_seo_intro"
                        checked={siteForm.hide_seo_intro}
                        onChange={handleSiteCheckboxChange}
                      />
                      Hide this section
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Footer text</label>
                    <input type="text" name="footer_text" value={siteForm.footer_text} onChange={handleSiteFormChange} className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Adults only. 18+." />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded text-xs">Save</button>
                    <button type="button" onClick={() => setEditingSite(false)} className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-semibold py-2 rounded text-xs">Cancel</button>
                  </div>
                </form>
              )}
            </div>

            <div className="border border-border rounded-lg p-6 bg-card sticky top-24 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings size={20} className="text-primary" />
                Popup Settings
              </h2>

              {!editingPopup ? (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary p-3">
                    <div>
                      <p className="text-sm font-medium">Hide registration popup</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        When on, the affiliate link opens after the thumbnail
                        loading animation — no popup.
                      </p>
                    </div>
                    <Switch
                      checked={!!popupSettings?.hide_popup}
                      onCheckedChange={handleHidePopupChange}
                      disabled={hidePopupSaving || !popupSettings}
                    />
                  </div>

                  {/* Preview */}
                  <div>
                    <h3 className="font-semibold mb-3">Preview</h3>
                    <div className="p-4 rounded-lg border border-border bg-secondary">
                      <h4 className="font-bold mb-2 text-foreground">
                        {popupForm.title}
                      </h4>
                      <p className="text-xs mb-4 text-muted-foreground">
                        {popupForm.description}
                      </p>
                      <button className="w-full py-2 rounded text-sm font-semibold bg-primary text-primary-foreground">
                        {popupForm.button_text}
                      </button>
                    </div>
                  </div>

                  {/* Affiliate Link Display */}
                  <div>
                    <h3 className="font-semibold mb-2">Affiliate Link</h3>
                    <div className="p-3 bg-secondary rounded-lg border border-border break-all text-xs">
                      {popupForm.affiliate_link || "Not set"}
                    </div>
                  </div>

                  {/* Affiliate Routing Preview */}
                  <div>
                    <h3 className="font-semibold mb-2">Affiliate Routing (weighted)</h3>
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-secondary rounded-lg border border-border break-all">
                        <span className="text-muted-foreground">Link A:</span>{" "}
                        {popupForm.affiliate_link_a || "Not set"}
                      </div>
                      <div className="p-3 bg-secondary rounded-lg border border-border break-all">
                        <span className="text-muted-foreground">Link B:</span>{" "}
                        {popupForm.affiliate_link_b || "Not set"}
                      </div>
                      <div className="p-3 bg-secondary rounded-lg border border-border">
                        <span className="text-muted-foreground">% to A:</span>{" "}
                        {Math.min(100, Math.max(0, Number(popupForm.affiliate_split_a ?? 50)))}%
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingPopup(true)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded-lg transition-colors"
                  >
                    Edit Settings
                  </button>
                </>
              ) : (
                <form onSubmit={handleUpdatePopupSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Popup Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={popupForm.title}
                      onChange={handlePopupFormChange}
                      className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={popupForm.description}
                      onChange={handlePopupFormChange}
                      rows={3}
                      className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Button Text
                    </label>
                    <input
                      type="text"
                      name="button_text"
                      value={popupForm.button_text}
                      onChange={handlePopupFormChange}
                      className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold mb-3 text-muted-foreground">
                      Direct link mode (when popup is hidden)
                    </p>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Thumbnail loading message
                      </label>
                      <input
                        type="text"
                        name="direct_link_hint"
                        value={popupForm.direct_link_hint}
                        onChange={handlePopupFormChange}
                        placeholder="Almost there - finish signup to watch."
                        className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Shown under the spinner after the affiliate link opens.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold mb-3 text-muted-foreground">
                      Waiting for Registration screen
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Waiting Title
                        </label>
                        <input
                          type="text"
                          name="waiting_title"
                          value={popupForm.waiting_title}
                          onChange={handlePopupFormChange}
                          className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Waiting Description
                        </label>
                        <textarea
                          name="waiting_description"
                          value={popupForm.waiting_description}
                          onChange={handlePopupFormChange}
                          rows={3}
                          className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Waiting Button Text
                        </label>
                        <input
                          type="text"
                          name="waiting_button_text"
                          value={popupForm.waiting_button_text}
                          onChange={handlePopupFormChange}
                          className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Affiliate Link
                    </label>
                    <input
                      type="url"
                      name="affiliate_link"
                      value={popupForm.affiliate_link}
                      onChange={handlePopupFormChange}
                      placeholder="https://signup.example.com"
                      className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold mb-3 text-muted-foreground">
                      Affiliate routing (random per click)
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Affiliate Link A
                        </label>
                        <input
                          type="url"
                          name="affiliate_link_a"
                          value={popupForm.affiliate_link_a}
                          onChange={handlePopupFormChange}
                          placeholder="https://offer-a.example.com"
                          className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Affiliate Link B
                        </label>
                        <input
                          type="url"
                          name="affiliate_link_b"
                          value={popupForm.affiliate_link_b}
                          onChange={handlePopupFormChange}
                          placeholder="https://offer-b.example.com"
                          className="w-full px-3 py-2 bg-input border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Traffic split (% to Link A)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            name="affiliate_split_a"
                            min={0}
                            max={100}
                            step={1}
                            value={Number(popupForm.affiliate_split_a ?? 50)}
                            onChange={(e) =>
                              setPopupForm((prev) => ({
                                ...prev,
                                affiliate_split_a: Number(e.target.value),
                              }))
                            }
                            className="flex-1"
                          />
                          <input
                            type="number"
                            name="affiliate_split_a"
                            min={0}
                            max={100}
                            step={1}
                            value={Number(popupForm.affiliate_split_a ?? 50)}
                            onChange={(e) =>
                              setPopupForm((prev) => ({
                                ...prev,
                                affiliate_split_a: Number(e.target.value),
                              }))
                            }
                            className="w-24 px-3 py-2 bg-input border border-border rounded text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Each click is routed randomly: Link A gets this %, Link B gets the
                          remaining {100 - Math.min(100, Math.max(0, Number(popupForm.affiliate_split_a ?? 50)))}%.
                          If only one link is set, it will always be used.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded text-xs transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPopup(false)}
                      className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-semibold py-2 rounded text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
