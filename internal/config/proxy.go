package config

// SOCKS5Config holds global SOCKS5 proxy server settings.
type SOCKS5Config struct {
	Address  string `json:"address"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
}

// NetworkConfig holds outbound network settings shared by connectors.
type NetworkConfig struct {
	SOCKS5 SOCKS5Config `json:"socks5"`
}

// SOCKS5Public is the admin-safe SOCKS5 view (password omitted).
type SOCKS5Public struct {
	Address     string `json:"address"`
	Username    string `json:"username"`
	HasPassword bool   `json:"has_password"`
}

// NetworkConfigPublic is the admin-safe network settings view.
type NetworkConfigPublic struct {
	SOCKS5 SOCKS5Public `json:"socks5"`
}

// VKConfigPublic is the admin-safe VK settings view.
type VKConfigPublic struct {
	Enabled  bool   `json:"enabled"`
	Channel  string `json:"channel"`
	UseProxy bool   `json:"use_proxy"`
}

func (n NetworkConfig) public() NetworkConfigPublic {
	return NetworkConfigPublic{
		SOCKS5: SOCKS5Public{
			Address:     n.SOCKS5.Address,
			Username:    n.SOCKS5.Username,
			HasPassword: n.SOCKS5.Password != "",
		},
	}
}

func (v VKConfig) public() VKConfigPublic {
	return VKConfigPublic(v)
}

// EffectiveSOCKS5 returns global SOCKS settings when useProxy is true, else nil (direct dial).
func EffectiveSOCKS5(global SOCKS5Config, useProxy bool) *SOCKS5Config {
	if !useProxy {
		return nil
	}
	cfg := global
	return &cfg
}

// ProxyRequired reports whether any connector has use_proxy enabled.
func (c *Config) ProxyRequired() bool {
	return c.YouTube.UseProxy || c.VK.UseProxy
}

// MergeNetworkSOCKS5From copies SOCKS5 password from prev when incoming field is empty.
func (c *Config) MergeNetworkSOCKS5From(prev Config) {
	if c.Network.SOCKS5.Password == "" {
		c.Network.SOCKS5.Password = prev.Network.SOCKS5.Password
	}
}
