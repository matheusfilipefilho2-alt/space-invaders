package external

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type IPFSClient struct {
	apiURL    string // e.g., https://api.pinata.cloud
	apiKey    string
	apiSecret string
	client    *http.Client
}

func NewIPFSClient(apiURL, apiKey, apiSecret string) *IPFSClient {
	return &IPFSClient{
		apiURL:    apiURL,
		apiKey:    apiKey,
		apiSecret: apiSecret,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type PinataResponse struct {
	IpfsHash string `json:"IpfsHash"`
}

func (c *IPFSClient) UploadJSON(ctx context.Context, data interface{}) (string, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("failed to marshal JSON: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.apiURL+"/pinning/pinJSONToIPFS", bytes.NewReader(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("pinata_api_key", c.apiKey)
	req.Header.Set("pinata_secret_api_key", c.apiSecret)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("IPFS upload failed: %s", string(body))
	}

	var pinataResp PinataResponse
	if err := json.NewDecoder(resp.Body).Decode(&pinataResp); err != nil {
		return "", err
	}

	return "ipfs://" + pinataResp.IpfsHash, nil
}

func (c *IPFSClient) UploadImage(ctx context.Context, imageData []byte) (string, error) {
	// Simplified implementation - in production would use multipart form data
	// to upload image file to Pinata's pinFileToIPFS endpoint
	// For now, return placeholder for demonstration
	_ = ctx
	_ = imageData
	return "ipfs://QmExampleImageHash123", nil
}
