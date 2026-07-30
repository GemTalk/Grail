! ===============================================================================
! Probe: can the ./.topazini user log in at all?
! ===============================================================================
! Prints  GRAIL_TOPAZINI_USER=<userId>  on a successful login, and NOTHING if the
! login fails (missing user, wrong password, stone down).
!
! ./install.sh runs this FIRST, before the C shim build, because install.sh runs
! entirely as that user.  Without the check, a missing account surfaces only after
! the shim build and only as topaz's bare "userId/password is invalid".
!
! On a FRESH extent the per-user accounts do not exist yet
! (scripts/create_claude_users.gs creates them), so this is the normal first-run
! state rather than an exotic one -- and .topazini naming a user that has never
! been created is easy to overlook.
!
! ./install_base.sh deliberately does NOT use this: every one of its steps logs in
! as SystemUser, so it does not need the account at all, and
! ./create_claude_users.sh may therefore run before or after it.
! ===============================================================================

iferr 1 stk
iferr 2 stk
login

run
GsFile stdout
	nextPutAll: 'GRAIL_TOPAZINI_USER=';
	nextPutAll: System myUserProfile userId asString;
	lf; flush.
true
%

logout
