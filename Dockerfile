FROM amazonlinux:2

RUN yum groupinstall "Development Tools" -y
RUN yum install tar gzip git -y
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.6/install.sh | bash
RUN /bin/bash -c "source /root/.nvm/nvm.sh; nvm install 10"

CMD /bin/bash -c "source /root/.nvm/nvm.sh; nvm use 10; bash"