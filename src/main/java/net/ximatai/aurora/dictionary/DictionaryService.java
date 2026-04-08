package net.ximatai.aurora.dictionary;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import net.ximatai.aurora.common.BusinessException;
import net.ximatai.aurora.operationlog.OperationLogService;
import net.ximatai.aurora.project.ProjectRepository;

@Service
@Transactional
public class DictionaryService {

	private final DictionaryRepository dictionaryRepository;
	private final ProjectRepository projectRepository;
	private final OperationLogService operationLogService;

	public DictionaryService(DictionaryRepository dictionaryRepository, ProjectRepository projectRepository, OperationLogService operationLogService) {
		this.dictionaryRepository = dictionaryRepository;
		this.projectRepository = projectRepository;
		this.operationLogService = operationLogService;
	}

	@Transactional(readOnly = true)
	public List<DictionaryOptionResponse> listOptions(DictionaryType type) {
		return dictionaryRepository.findByTypeAndEnabledTrueOrderBySortOrderAscIdAsc(type).stream()
			.map(DictionaryOptionResponse::from)
			.toList();
	}

	@Transactional(readOnly = true)
	public List<DictionaryEntryResponse> listEntries(DictionaryType type) {
		if (type == null) {
			return dictionaryRepository.findAll().stream()
				.sorted(java.util.Comparator
					.comparing((DictionaryEntry item) -> item.getType().code())
					.thenComparing(DictionaryEntry::getSortOrder)
					.thenComparing(DictionaryEntry::getId))
				.map(this::toEntryResponse)
				.toList();
		}
		return dictionaryRepository.findByTypeOrderBySortOrderAscIdAsc(type).stream()
			.map(this::toEntryResponse)
			.toList();
	}

	@Transactional(readOnly = true)
	public boolean isEnabledCodeSupported(DictionaryType type, String code) {
		return code != null && dictionaryRepository.findByTypeAndCode(type, code)
			.map(DictionaryEntry::isEnabled)
			.orElse(false);
	}

	@Transactional(readOnly = true)
	public String resolveLabel(DictionaryType type, String code) {
		if (code == null || code.isBlank()) {
			return null;
		}
		return dictionaryRepository.findByTypeAndCode(type, code)
			.map(DictionaryEntry::getLabel)
			.orElse(code);
	}

	@Transactional(readOnly = true)
	public Map<String, String> resolveLabels(DictionaryType type, List<String> codes) {
		if (codes == null || codes.isEmpty()) {
			return Map.of();
		}
		return dictionaryRepository.findByTypeOrderBySortOrderAscIdAsc(type).stream()
			.filter(entry -> codes.contains(entry.getCode()))
			.collect(Collectors.toMap(DictionaryEntry::getCode, DictionaryEntry::getLabel, (left, right) -> left));
	}

	public DictionaryEntryResponse create(DictionaryEntryRequest request) {
		DictionaryType type = DictionaryType.fromCode(request.type());
		String code = normalizeCode(request.code());
		if (dictionaryRepository.existsByTypeAndCode(type, code)) {
			throw new BusinessException(HttpStatus.CONFLICT, "同类型下编码已存在");
		}

		DictionaryEntry entry = new DictionaryEntry();
		apply(entry, type, code, request);
		dictionaryRepository.save(entry);
		operationLogService.log("数据字典", "新增字典项", "字典项", String.valueOf(entry.getId()), entry.getLabel(),
			"type=" + type.code() + "，code=" + entry.getCode());
		return toEntryResponse(entry);
	}

	public DictionaryEntryResponse update(Long id, DictionaryEntryRequest request) {
		DictionaryEntry entry = dictionaryRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("字典项不存在"));
		DictionaryType type = DictionaryType.fromCode(request.type());
		String code = normalizeCode(request.code());
		dictionaryRepository.findByTypeAndCode(type, code)
			.filter(found -> !Objects.equals(found.getId(), id))
			.ifPresent(found -> {
				throw new BusinessException(HttpStatus.CONFLICT, "同类型下编码已存在");
			});

		if (!entry.getType().equals(type) || !entry.getCode().equals(code)) {
			assertNotReferenced(entry);
		}

		String beforeSummary = describeEntry(entry);
		apply(entry, type, code, request);
		operationLogService.log("数据字典", "编辑字典项", "字典项", String.valueOf(entry.getId()), entry.getLabel(),
			beforeSummary + " -> " + describeEntry(entry));
		return toEntryResponse(entry);
	}

	public void delete(Long id) {
		DictionaryEntry entry = dictionaryRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("字典项不存在"));
		assertNotReferenced(entry);
		String targetName = entry.getLabel();
		String detail = describeEntry(entry);
		dictionaryRepository.delete(entry);
		operationLogService.log("数据字典", "删除字典项", "字典项", String.valueOf(entry.getId()), targetName, detail);
	}

	private void apply(DictionaryEntry entry, DictionaryType type, String code, DictionaryEntryRequest request) {
		entry.setType(type);
		entry.setCode(code);
		entry.setLabel(request.label().trim());
		entry.setSortOrder(request.sortOrder());
		entry.setEnabled(Boolean.TRUE.equals(request.enabled()));
	}

	private void assertNotReferenced(DictionaryEntry entry) {
		boolean referenced = switch (entry.getType()) {
			case UNDERTAKING_UNIT -> projectRepository.existsByUndertakingUnit(entry.getCode());
			case PROJECT_CATEGORY -> projectRepository.existsByCategory(entry.getCode());
		};
		if (referenced) {
			throw new BusinessException(HttpStatus.CONFLICT, "该字典项已被项目使用，不能修改编码或删除");
		}
	}

	private static String normalizeCode(String value) {
		String code = value == null ? "" : value.trim();
		if (code.isEmpty()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "编码不能为空");
		}
		return code;
	}

	private static String describeEntry(DictionaryEntry entry) {
		return "type=" + entry.getType().code()
			+ "，code=" + entry.getCode()
			+ "，label=" + entry.getLabel()
			+ "，enabled=" + entry.isEnabled()
			+ "，sortOrder=" + entry.getSortOrder();
	}

	private DictionaryEntryResponse toEntryResponse(DictionaryEntry entry) {
		return DictionaryEntryResponse.from(entry, referenceCount(entry));
	}

	private long referenceCount(DictionaryEntry entry) {
		return switch (entry.getType()) {
			case UNDERTAKING_UNIT -> projectRepository.countByUndertakingUnit(entry.getCode());
			case PROJECT_CATEGORY -> projectRepository.countByCategory(entry.getCode());
		};
	}
}
