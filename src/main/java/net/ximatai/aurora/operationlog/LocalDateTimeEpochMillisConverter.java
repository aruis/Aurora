package net.ximatai.aurora.operationlog;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class LocalDateTimeEpochMillisConverter implements AttributeConverter<LocalDateTime, Long> {

	@Override
	public Long convertToDatabaseColumn(LocalDateTime attribute) {
		if (attribute == null) {
			return null;
		}
		return attribute.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
	}

	@Override
	public LocalDateTime convertToEntityAttribute(Long dbData) {
		if (dbData == null) {
			return null;
		}
		return LocalDateTime.ofInstant(Instant.ofEpochMilli(dbData), ZoneId.systemDefault());
	}
}
