import docker
import asyncio
import tempfile
import os
from typing import Tuple
import logging

logger = logging.getLogger(__name__)

class DockerExecutor:
    def __init__(self):
        self.client = None
        self.image_name = "python-ide-executor"
        self._initialized = False

    async def initialize(self):
        """Initialize Docker client and build execution image"""
        try:
            self.client = docker.from_env()
            await self._build_execution_image()
            self._initialized = True
            logger.info("Docker executor initialized successfully")
        except Exception as e:
            logger.warning(f"Docker not available: {e}")
            self._initialized = False

    async def _build_execution_image(self):
        """Build the Docker image for code execution"""
        try:
            # Check if image exists
            try:
                self.client.images.get(self.image_name)
                logger.info(f"Docker image {self.image_name} already exists")
                return
            except docker.errors.ImageNotFound:
                pass

            # Build image from Dockerfile
            dockerfile_path = os.path.join(os.path.dirname(__file__), "Dockerfile.execution")
            if os.path.exists(dockerfile_path):
                logger.info(f"Building Docker image {self.image_name}")
                self.client.images.build(
                    path=os.path.dirname(__file__),
                    dockerfile="Dockerfile.execution",
                    tag=self.image_name
                )
                logger.info(f"Successfully built Docker image {self.image_name}")
            else:
                logger.warning("Dockerfile.execution not found, using default Python image")
                self.image_name = "python:3.11-slim"
        except Exception as e:
            logger.error(f"Failed to build Docker image: {e}")
            self.image_name = "python:3.11-slim"

    async def execute_code(self, code: str, timeout: int = 10) -> Tuple[str, str]:
        """
        Execute Python code in a Docker container
        Returns (stdout, stderr)
        """
        if not self._initialized or not self.client:
            raise RuntimeError("Docker executor not initialized")

        # Create temporary file with code
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as tmp_file:
            tmp_file.write(code)
            tmp_file_path = tmp_file.name

        try:
            # Run code in Docker container
            result = self.client.containers.run(
                self.image_name,
                f"python {os.path.basename(tmp_file_path)}",
                volumes={os.path.dirname(tmp_file_path): {'bind': '/app', 'mode': 'ro'}},
                working_dir="/app",
                mem_limit="128m",  # Limit memory to 128MB
                cpu_quota=50000,   # Limit CPU to 50% of one core
                network_disabled=True,  # Disable network access
                remove=True,       # Auto-remove container
                timeout=timeout,
                user="1000:1000",  # Run as non-root user
                stdout=True,
                stderr=True,
                detach=False
            )
            
            # Docker returns combined output, we need to separate stdout/stderr
            output = result.decode('utf-8', errors='replace').strip()
            return output, ""
            
        except docker.errors.ContainerError as e:
            # Container ran but exited with non-zero code
            stdout = e.result.attrs.get('Output', b'').decode('utf-8', errors='replace').strip()
            stderr = str(e).strip()
            return stdout, stderr
            
        except docker.errors.APIError as e:
            return "", f"Docker API error: {str(e)}"
            
        except Exception as e:
            return "", f"Execution error: {str(e)}"
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(tmp_file_path)
            except:
                pass

    def is_available(self) -> bool:
        """Check if Docker executor is available"""
        return self._initialized and self.client is not None

# Global instance
docker_executor = DockerExecutor()
