r"""
    Twilio - Api / V2010 version.

    GRAIL NOTE: from the twilio 9.10.9 source drop, with one
    deviation: the ``@account.setter`` override hook is omitted
    (Grail's property codegen is getter-only today; nothing on the
    Messages path assigns ``version.account``).
"""

from typing import Optional
from twilio.base.version import Version
from twilio.base.domain import Domain
from twilio.rest.api.v2010.account import AccountList
from twilio.rest.api.v2010.account import AccountContext


class V2010(Version):

    def __init__(self, domain: Domain):
        """
        Initialize the V2010 version of Api

        :param domain: The Twilio.api domain
        """
        super().__init__(domain, "2010-04-01")
        self._accounts: Optional[AccountList] = None
        self._account: Optional[AccountContext] = None

    @property
    def accounts(self) -> AccountList:
        if self._accounts is None:
            self._accounts = AccountList(self)
        return self._accounts

    @property
    def account(self) -> AccountContext:
        if self._account is None:
            self._account = AccountContext(self, self.domain.twilio.account_sid)
        return self._account

    def __repr__(self) -> str:
        """
        Provide a friendly representation
        :returns: Machine friendly representation
        """
        return "<Twilio.Api.V2010>"
