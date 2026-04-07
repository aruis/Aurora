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
import net.ximatai.aurora.operationlog.OperationLogService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthenticationManager authenticationManager;
	private final SecurityContextRepository securityContextRepository;
	private final AuthService authService;
	private final OperationLogService operationLogService;

	public AuthController(AuthenticationManager authenticationManager, SecurityContextRepository securityContextRepository,
		AuthService authService, OperationLogService operationLogService) {
		this.authenticationManager = authenticationManager;
		this.securityContextRepository = securityContextRepository;
		this.authService = authService;
		this.operationLogService = operationLogService;
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
			AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
			operationLogService.logWithActor(
				"认证",
				"登录",
				"用户",
				String.valueOf(principal.getId()),
				principal.getUsername(),
				"登录成功",
				true,
				principal.getId(),
				principal.getUsername(),
				principal.getDisplayName());
			return new LoginResponse(CurrentUserResponse.fromPrincipal((AppUserPrincipal) authentication.getPrincipal()));
		}
		catch (AuthenticationException ex) {
			operationLogService.logWithActor("认证", "登录", "用户", null, request.username(), "登录失败", false, null, request.username(), request.username());
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "用户名或密码错误");
		}
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
		operationLogService.log("认证", "登出", "会话", null, null, "用户退出登录");
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
		operationLogService.log("认证", "修改密码", "用户", String.valueOf(principal.getId()), principal.getUsername(), "用户修改了自己的登录密码");
		HttpSession session = httpRequest.getSession(false);
		if (session != null) {
			session.invalidate();
		}
		SecurityContextHolder.clearContext();
		securityContextRepository.saveContext(SecurityContextHolder.createEmptyContext(), httpRequest, httpResponse);
		return ResponseEntity.noContent().build();
	}
}
