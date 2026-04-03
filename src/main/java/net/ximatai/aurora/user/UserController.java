package net.ximatai.aurora.user;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

	private final UserService userService;

	public UserController(UserService userService) {
		this.userService = userService;
	}

	@GetMapping
	public List<UserResponse> list() {
		return userService.list();
	}

	@PostMapping
	public UserResponse create(@Valid @RequestBody UserCreateRequest request) {
		return userService.create(request);
	}

	@PutMapping("/{id}")
	public UserResponse update(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request) {
		return userService.update(id, request);
	}

	@PostMapping("/{id}/enable")
	public UserResponse enable(@PathVariable Long id) {
		return userService.enable(id);
	}

	@PostMapping("/{id}/disable")
	public UserResponse disable(@PathVariable Long id) {
		return userService.disable(id);
	}

	@PostMapping("/{id}/reset-password")
	public void resetPassword(@PathVariable Long id, @Valid @RequestBody ResetPasswordRequest request) {
		userService.resetPassword(id, request);
	}
}
