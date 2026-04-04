package net.ximatai.aurora.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.admin")
public class AdminBootstrapProperties {

	private String bootstrapPassword = "admin123";

	private boolean resetOnStartup = false;

	public String getBootstrapPassword() {
		return bootstrapPassword;
	}

	public void setBootstrapPassword(String bootstrapPassword) {
		this.bootstrapPassword = bootstrapPassword;
	}

	public boolean isResetOnStartup() {
		return resetOnStartup;
	}

	public void setResetOnStartup(boolean resetOnStartup) {
		this.resetOnStartup = resetOnStartup;
	}
}
