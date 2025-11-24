import secrets
import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from config import SMTP_CONFIG
from models import AuthCode

class CodeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _validate_email(self, email: str) -> bool:
        """Валидация email с помощью регулярного выражения"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    @staticmethod
    def generate_code() -> str:
        """Генерация 6-значного кода"""
        return str(secrets.randbelow(1000000)).zfill(6)

    async def send_code_for_registration(self, email: str) -> dict:
        """Отправка кода для подтверждения регистрации"""
        email = email.lower().strip()

        # Валидация email
        if not self._validate_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный формат email"
            )

        # Устареваем предыдущие коды для этого email
        await self._invalidate_old_codes(email)
        
        # Генерируем и сохраняем новый код
        code = self.generate_code()
        auth_code = AuthCode(email=email, code=code)
        self.db.add(auth_code)
        await self.db.commit()

        # Отправляем email
        email_sent = self._send_email(email, code)
        
        if email_sent:
            return {
                "message": "Код подтверждения отправлен на вашу почту",
                "email": email
            }
        else:
            # В режиме разработки возвращаем код для отладки
            return {
                "message": "Код сгенерирован", 
                "debug_code": code,
                "email": email
            }

    async def verify_code(self, email: str, code: str) -> bool:
        """Проверка валидности кода"""
        email = email.lower().strip()
        code = code.strip()

        # Валидация входных данных
        if not self._validate_email(email):
            return False

        if len(code) != 6 or not code.isdigit():
            return False

        stmt = select(AuthCode).where(
            AuthCode.email == email,
            AuthCode.code == code,
            AuthCode.is_used == False,
        )
        result = await self.db.execute(stmt)
        auth_code = result.scalar_one_or_none()

        if auth_code:
            # Помечаем код как использованный
            auth_code.is_used = True
            await self.db.commit()
            return True
        
        return False

    async def _invalidate_old_codes(self, email: str):
        """Помечаем старые коды как использованные"""
        stmt = select(AuthCode).where(
            AuthCode.email == email,
            AuthCode.is_used == False
        )
        result = await self.db.execute(stmt)
        old_codes = result.scalars().all()
        
        for old_code in old_codes:
            old_code.is_used = True
        
        if old_codes:
            await self.db.commit()

    def _send_email(self, email_to: str, code: str) -> bool:
        """Отправка email с кодом подтверждения"""
        smtp_host = SMTP_CONFIG["HOST"]
        smtp_port = SMTP_CONFIG["PORT"]
        smtp_user = SMTP_CONFIG["USER"]
        smtp_password = SMTP_CONFIG["PASSWORD"]

        message = MIMEMultipart()
        message["From"] = smtp_user
        message["To"] = email_to
        message["Subject"] = "Код подтверждения регистрации"

        body = f"""
        <h2>Подтверждение регистрации</h2>
        <p>Ваш код для подтверждения регистрации: <strong>{code}</strong></p>
        <p>Код действителен в течение 10 минут.</p>
        <p>Если вы не регистрировались в нашем сервисе, проигнорируйте это письмо.</p>
        """
        message.attach(MIMEText(body, "html"))

        try:
            with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, email_to, message.as_string())
            return True
            
        except Exception as e:
            print(f"Ошибка отправки email: {e}")
            return False