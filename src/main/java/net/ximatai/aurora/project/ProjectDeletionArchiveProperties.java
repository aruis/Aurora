package net.ximatai.aurora.project;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.project-delete-archive")
public record ProjectDeletionArchiveProperties(
	String file
) {
}
