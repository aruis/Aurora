package net.ximatai.aurora.dictionary;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/dictionaries")
public class DictionaryController {

	private final DictionaryService dictionaryService;

	public DictionaryController(DictionaryService dictionaryService) {
		this.dictionaryService = dictionaryService;
	}

	@GetMapping
	@PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'FINANCE')")
	public List<DictionaryOptionResponse> listOptions(@RequestParam String type) {
		return dictionaryService.listOptions(DictionaryType.fromCode(type));
	}

	@GetMapping("/admin")
	@PreAuthorize("hasRole('ADMIN')")
	public List<DictionaryEntryResponse> listAdmin(@RequestParam(required = false) String type) {
		return dictionaryService.listEntries(type == null ? null : DictionaryType.fromCode(type));
	}

	@PostMapping
	@PreAuthorize("hasRole('ADMIN')")
	public DictionaryEntryResponse create(@Valid @RequestBody DictionaryEntryRequest request) {
		return dictionaryService.create(request);
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN')")
	public DictionaryEntryResponse update(@PathVariable Long id, @Valid @RequestBody DictionaryEntryRequest request) {
		return dictionaryService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN')")
	public void delete(@PathVariable Long id) {
		dictionaryService.delete(id);
	}
}
