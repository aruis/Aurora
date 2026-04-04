package net.ximatai.aurora.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import net.ximatai.aurora.common.BusinessException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthenticationManager authenticationManager;
	private final SecurityContextRepository securityContextRepository;
	private final AuthService authService;

	public AuthController(AuthenticationManager authenticationManager, SecurityContextRepository securityContextRepository,
		AuthService authService) {
		this.authenticationManager = authenticationManager;
		this.securityContextRepository = securityContextRepository;
		this.authService = authService;
	}

	@PostMapping("/login")
	public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
		try {
			Authentication authentication = authenticationManager.authenticate(
				UsernamePasswordAuthenticationToken.unauthenticated(request.username(), request.password()));
			SecurityContext context = SecurityContextHolder.createEmptyContext();
			context.setAuthentication(authentication);
			SecurityContextHolder.setContext(context);
			securityContextRepository.saveContext(context, httpRequest, httpResponse);
			return new LoginResponse(CurrentUserResponse.fromPrincipal((AppUserPrincipal) authentication.getPrincipal()));
		}
		catch (AuthenticationException ex) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "用户名或密码错误");
		}
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		SecurityContextHolder.clearContext();
		securityContextRepository.saveContext(SecurityContextHolder.createEmptyContext(), request, response);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/me")
	public CurrentUserResponse me(@AuthenticationPrincipal AppUserPrincipal principal) {
		return CurrentUserResponse.fromPrincipal(principal);
	}

	@PostMapping("/change-password")
	public ResponseEntity<Void> changePassword(@AuthenticationPrincipal AppUserPrincipal principal,
		@Valid @RequestBody ChangePasswordRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
		authService.changePassword(principal.getId(), request);
		HttpSession session = httpRequest.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		SecurityContextHolder.clearContext();
		securityContextRepository.saveContext(SecurityContextHolder.createEmptyContext(), httpRequest, httpResponse);
		return ResponseEntity.noContent().build();
	}
}
