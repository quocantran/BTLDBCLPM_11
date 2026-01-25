import { CertificateService, type ApiParamsProps } from "@/services";
import { useState } from "react";

type CertificateResponse = {
  data: any[];
  message: string;
  success: boolean;
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

export const useCertificate = (params?: ApiParamsProps) => {
  const {
    data: dataResponse = { data: [] },
    isLoading: loading,
    error,
    refetch: getCertificate,
  } = CertificateService.useGet<CertificateResponse>({
    url: "",
    params,
    options: {
      refetchOnWindowFocus: false,
    },
  });

  return {
    data: dataResponse?.data || [],
    loading,
    error,
    getCertificate,
  };
};

export const useCertificateIssue = () => {
  const {
    mutateAsync,
    isPending: loading,
    error,
    data,
  } = CertificateService.usePost({
    url: "/issue",
  });

  const issueCertificate = async (certificateData: any) => {
    return mutateAsync({ data: certificateData });
  };

  return {
    data: (data as any)?.data,
    loading,
    error,
    issueCertificate,
  };
};
