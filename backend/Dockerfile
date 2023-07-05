FROM node:latest

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json .
RUN npm install

# Bundle app source
COPY . .

# Volume for node_modules
VOLUME [ "/usr/src/app/node_modules" ]

# Expose port 80
EXPOSE 80

# Set environment variables
ENV PORT=80
ENV SESSION_SECRET=secret
ENV JWT_SECRET=secret
ENV JWT_EXPIRES_IN=1d
ENV MONGO_USER=username
ENV MONGO_USER_PASS=password
ENV MONGO_HOST=host
ENV MONGO_DATABASE=database
ENV MYSQL_USER=username
ENV MYSQL_ROOT_PASS=password
ENV MYSQL_HOST=host
ENV MYSQL_DATABASE=database
ENV OPENAI_API_KEY=secret
ENV AWS_ACCESS_KEY_ID=accesskey
ENV AWS_SECRET_ACCESS_KEY=secretaccesskey
ENV AWS_S3_BUCKET_NAME=bucketname

# Start the app
CMD [ "npm", "run", "start:dev" ]